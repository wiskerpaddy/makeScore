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
    const val = input.value;
    
    // カーソルがどこにあるか確認
    const start = input.selectionStart;
    const end = input.selectionEnd;

    // もしカーソルが先頭（メタデータ部分）にあるか、何も選択されていない場合
    // かつ、入力エリアのデリミタ（% --- [ 譜面入力エリア ] ---）がある場合
    const footerMarker = "% -------------------------";
    const markerIndex = val.indexOf(footerMarker);

    if (start === 0 && markerIndex !== -1) {
        // デリミタの直前に挿入する（最後尾に追加していく感覚）
        input.value = val.substring(0, markerIndex) + text + val.substring(markerIndex);
        const newPos = markerIndex + text.length;
        input.setSelectionRange(newPos, newPos);
    } else {
        // カーソルが任意の位置にある場合は、その場に挿入
        input.value = val.substring(0, start) + text + val.substring(end);
        const newPos = start + text.length;
        input.setSelectionRange(newPos, newPos);
    }
    
    input.focus();
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
 * 簡易リズムチェック
 */
function checkRhythm() {
    const text = input.value;
    const lines = text.split('\n');
    let measureLength = 8; // デフォルト 4/4

    const mMatch = text.match(/M:(\d+)\/(\d+)/);
    if (mMatch) {
        measureLength = parseInt(mMatch[1]) * (8 / parseInt(mMatch[2]));
    }

    let feedback = [];
    lines.forEach((line, index) => {
        if (line.includes(':') || line.trim() === "") return;

        const measures = line.split('|');
        measures.forEach((m, i) => {
            const cleanM = m.replace(/\[.*?\]/g, "").trim();
            if (cleanM === "" || i === measures.length - 1 && cleanM === "") return;

            const notes = cleanM.match(/([a-gA-G][0-9/]*)/g);
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
                feedback.push(`${index + 1}行目 第${i + 1}小節: ${count}/${measureLength}拍`);
            }
        });
    });

    alert(feedback.length > 0 ? "【要確認】\n" + feedback.join('\n') : "リズムチェックOK！");
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

async function saveAsImage() {
    const svg = document.querySelector('#paper svg');
    if (!svg) {
        alert("保存する楽譜がありません。");
        return;
    }

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