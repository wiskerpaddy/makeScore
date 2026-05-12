const input = document.getElementById('abc-input');

// ★ヘッダー情報を分離して保持
const ABC_HEADER = "X:1\nM:4/4\nK:C\nL:1/8\n";

/**
 * 挿入後に楽譜エリアを少しだけ見えるようにする（任意）
 */
function render() {
    const fullAbc = ABC_HEADER + input.value;
    ABCJS.renderAbc("paper", fullAbc, {
        responsive: "resize",
        add_classes: true
    });
    
    // スマホ時、入力が重なってきたら楽譜エリアを視界に入れる
    if (window.innerWidth < 600) {
        document.getElementById('paper').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}
/**
 * テキストを入力エリアの適切な位置（基本は末尾）に挿入する
 */
function insertText(text) {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const val = input.value;
    
    input.value = val.substring(0, start) + text + val.substring(end);
    
    input.focus();
    const newPos = start + text.length;
    input.setSelectionRange(newPos, newPos);
    
    // 記号を挿入した直後にも自動レンダリング
    render();
}

/**
 * 音符ボタン用の関数（末尾にスペースを入れるなど調整）
 */
function addNote(noteName) {
    const duration = document.querySelector('input[name="dur"]:checked').value;
    // 音符の後に半角スペースを入れると、次の入力が楽になります
    insertText(noteName + duration + " ");
}

/**
 * 拍数・小節チェック（ロジックの改善）
 */
function checkRhythm(isSilent = false) {
    const text = input.value;
    const lines = text.split('\n');
    let measureLength = 8; 

    const mMatch = text.match(/M:(\d+)\/(\d+)/);
    if (mMatch) {
        measureLength = parseInt(mMatch[1]) * (8 / parseInt(mMatch[2]));
    }

    // ★小節線の存在チェック
    if (!text.includes('|')) {
        const msg = "【確認】小節線（|）が見当たりません。長いフレーズの場合は小節線を入れると正確にチェックできます。";
        if (!isSilent) alert(msg);
        return { ok: false, msg: msg };
    }

    let feedback = [];
    lines.forEach((line, index) => {
        if (line.includes(':') || line.trim() === "" || line.startsWith('%')) return;

        const measures = line.split('|');
        measures.forEach((m, i) => {
            const cleanM = m.replace(/\[.*?\]/g, "").trim();
            if (cleanM === "" || (i === measures.length - 1 && cleanM === "")) return;

            const notes = cleanM.match(/([a-gA-Gz][0-9/]*)/g); // 休符zもカウントに含める
            let count = 0;
            if (notes) {
                notes.forEach(n => {
                    let val = 1;
                    const numMatch = n.match(/\d+/);
                    if (numMatch) val = parseInt(numMatch[0]);
                    if (n.includes('/')) val /= 2;
                    count += val;
                });
            }

            if (count > 0 && count !== measureLength) {
                // 文言の調整：何拍足りない（多い）かを分かりやすく
                const diff = count - measureLength;
                const status = diff > 0 ? `${Math.abs(diff)}拍多い` : `${Math.abs(diff)}拍足りない`;
                feedback.push(`${index + 1}行目・第${i + 1}小節: ${status} (${count}/${measureLength}拍)`);
            }
        });
    });

    if (feedback.length > 0) {
        const fullMsg = "【リズムのズレがあります】\n\n" + feedback.join('\n');
        if (!isSilent) alert(fullMsg);
        return { ok: false, msg: fullMsg };
    }

    if (!isSilent) alert("リズムチェックOK！完璧なスコアです。");
    return { ok: true };
}

// イベントリスナー
input.addEventListener('input', render);
window.onload = render;

/**
 * サンプルコードを入力欄にセットする
 */
function setSample(abc) {
    if (confirm("入力欄の内容が上書きされます。よろしいですか？")) {
        input.value = abc.trim();
        render();
        // ヘルプを閉じる（任意）
        document.querySelector('details').open = false;
    }
}

function insertTempo(bpm, label) {
    const tempoString = `Q:1/4=${bpm} "${label}"\n`;
    // 文頭（X:1やK:Cの付近）に挿入するのが理想的
    input.value = input.value.replace(/(K:.*\n)/, `$1${tempoString}`);
    render();
}

// サンプルの実体データ
const SAMPLES = {
    swing: `X:1
M:4/4
K:C
L:1/8
(3DEF (3GAB (3cBA (3GFE | C8 |`,

    basic_chord: `X:1
M:4/4
K:C
L:1/8
[CEGB]4 [DFAc]4 | [G B d f]8 |`,

    bossa: `X:1
M:4/4
K:C
L:1/8
Q:1/4=120 "Bossa Nova"
[CEGB]2 [CEGB]2 z [CEGB]3 |`
};

/**
 * 名前を指定してサンプルを適用する
 */
function applySample(key) {
    const abc = SAMPLES[key];
    if (!abc) return;

    if (confirm("入力欄の内容が上書きされます。よろしいですか？")) {
        const input = document.getElementById('abc-input');
        input.value = abc.trim();
        // render関数は既存のものを使用
        render();
        // ヘルプを閉じる
        document.querySelector('details').open = false;
    }
}

/**
 * 保存ボタン：実行前にチェックを強制する
 */
async function saveAsImage() {
    // 保存前にサイレントモードでチェックを実行
    const result = checkRhythm(true); 
    
    if (!result.ok) {
        if (!confirm(result.msg + "\n\nこのまま保存しますか？")) {
            return; // キャンセルしたら保存処理を中断
        }
    }

    // --- 以下、既存の保存ロジック ---
    const svg = document.querySelector('#paper svg');
    if (!svg) return;

    // ファイル名（あなたのロジック）
    const now = new Date();
    const dateStr = now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0') +
        String(now.getSeconds()).padStart(2, '0');

    // 1. SVG の viewBox を取得（論理サイズ）
    const vb = svg.viewBox.baseVal;
    const width = vb.width;
    const height = vb.height;

    const padding = 40;
    const scale = 2;

    // 2. Canvas を固定サイズで作成
    const canvas = document.createElement('canvas');
    canvas.width = (width + padding * 2) * scale;
    canvas.height = (height + padding * 2) * scale;

    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 3. SVG をクローンして viewBox を維持
    const cloned = svg.cloneNode(true);
    cloned.setAttribute("width", width);
    cloned.setAttribute("height", height);

    const svgData = new XMLSerializer().serializeToString(cloned);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = function () {
        ctx.drawImage(img, padding, padding);
        URL.revokeObjectURL(url);

        const link = document.createElement("a");
        link.download = `score_${dateStr}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
    };
    img.src = url;
}

/**
 * 選択中の長さと音名を組み合わせて挿入する
 */
function addNote(noteName) {
    // ラジオボタンから選択中の長さを取得
    const duration = document.querySelector('input[name="dur"]:checked').value;
    
    // 音名 + 長さ + スペース を挿入
    insertText(noteName + duration + " ");
}

/**
 * 消去ボタン：最後の一文字（または一塊）を消す
 */
function deleteLast() {
    let val = input.value.trimEnd();
    if (val.length === 0) return;

    // スペースで区切られた最後の要素を消去する
    const lastSpace = val.lastIndexOf(" ");
    if (lastSpace !== -1) {
        input.value = val.substring(0, lastSpace + 1);
    } else {
        // スペースがない場合は一文字消す
        input.value = val.slice(0, -1);
    }
    render();
}

function insertNuance(symbol) {
    // スラー開始やアクセントは音符の直前に置くため、スペースなしで挿入
    insertText(symbol);
}