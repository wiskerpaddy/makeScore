const input = document.getElementById('abc-input');

// ★ヘッダー情報を分離して保持
const ABC_HEADER = "X:1\nM:4/4\nK:C\nL:1/8\n";

// 設定状態を管理
let scoreSettings = {
    meter: "4/4",
    tempo: "130",
    swing: true, // trueで"Swing"表示、falseで非表示(Straight)
    key: "C"
};

/**
 * 楽譜をレンダリングする
 */
function render() {
    // スイング表記の構築
    const swingText = scoreSettings.swing ? '"Swing"' : ""; 
    
    // ヘッダーを動的に生成
    const dynamicHeader = `X:1\nM:${scoreSettings.meter}\nK:${scoreSettings.key}\nL:1/8\nQ:1/4=${scoreSettings.tempo} ${swingText}\n`;
    
    const fullAbc = dynamicHeader + input.value;
    ABCJS.renderAbc("paper", fullAbc, {
        responsive: "resize",
        add_classes: true
    });

    // ★追加：Swingボタンの見た目を更新
    const swingBtn = document.getElementById('swing-btn');
    if (swingBtn) {
        if (scoreSettings.swing) {
            // ONの時：真鍮ゴールド（目立つ色）
            swingBtn.style.background = "#d4af37";
            swingBtn.style.color = "#121417";
            swingBtn.innerText = "Swing: ON";
        } else {
            // OFFの時：暗いグレー
            swingBtn.style.background = "#444";
            swingBtn.style.color = "#fff";
            swingBtn.innerText = "Swing: OFF";
        }
    }

    // UIのテキスト更新（拍数やテンポも同期）
    const meterDisplay = document.getElementById('ui-meter');
    if (meterDisplay) meterDisplay.innerText = scoreSettings.meter;
    
    const tempoDisplay = document.getElementById('ui-tempo');
    if (tempoDisplay) tempoDisplay.innerText = scoreSettings.tempo;
    
    if (window.innerWidth < 600) {
        document.getElementById('paper').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}
/**
 * 設定ボタンが押された時の処理
 */
function updateScoreSetting(key, value) {
    if (key === 'swing') {
        scoreSettings.swing = !scoreSettings.swing; // Swingボタンは押すたびにON/OFF
    } else if (key === 'meter_custom' || key === 'tempo_custom') {
        // 自由入力プロンプトを出す
        const newVal = prompt(`${key === 'meter_custom' ? '拍数' : 'テンポ'}を入力してください`, value);
        if (newVal) scoreSettings[key.split('_')[0]] = newVal;
    } else {
        scoreSettings[key] = value;
    }
    render(); // 楽譜を再描画
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
 * 最後の小節線を終止線（|]）に変換する
 */
function finalizeScore() {
    let val = input.value.trim();
    if (val.length === 0) return;

    if (val.endsWith("|")) {
        input.value = val.slice(0, -1) + "|]";
    } else if (!val.endsWith("|]")) {
        input.value = val + " |]";
    }
    render();
}

/**
 * 拍数・小節チェック（3連符対応版）
 */
function checkRhythm(isSilent = false) {
    const text = input.value;
    const lines = text.split('\n');
    
    // 現在の設定から1小節の長さを取得
    const [num, den] = scoreSettings.meter.split('/').map(Number);
    const measureLength = num * (8 / den); 

    let feedback = [];
    lines.forEach((line, index) => {
        // ヘッダーや空行を除外
        if (line.includes(':') || line.trim() === "" || line.startsWith('%')) return;

        const measures = line.split('|');
        measures.forEach((m, i) => {
            const cleanM = m.replace(/\[.*?\]/g, "").trim();
            if (cleanM === "" || (i === measures.length - 1 && cleanM === "")) return;

            // ★ 修正：3連符(3と、通常の音符/休符を分けて取得
            const tokens = cleanM.match(/(\(3|[a-gA-Gz][0-9/]*)/g);
            let count = 0;
            let tupletCount = 0; // 3連符の残り音符数

            if (tokens) {
                tokens.forEach(t => {
                    if (t === "(3") {
                        tupletCount = 3; // 次の3つを3連符として扱う
                        return;
                    }

                    let val = 1; // デフォルトL:1/8
                    const numMatch = t.match(/\d+/);
                    if (numMatch) val = parseInt(numMatch[0]);
                    if (t.includes('/')) val /= 2;

                    // 3連符の中にある音符なら、長さを2/3にする
                    if (tupletCount > 0) {
                        val = val * (2 / 3);
                        tupletCount--;
                    }
                    count += val;
                });
            }

            // 計算結果の判定（浮動小数点の誤差を考慮して0.01の余裕を持たせる）
            if (count > 0 && Math.abs(count - measureLength) > 0.01) {
                const diff = (count - measureLength).toFixed(1);
                const status = diff > 0 ? `${diff}拍多い` : `${Math.abs(diff)}拍足りない`;
                feedback.push(`${index + 1}行目・第${i + 1}小節: ${status} (${count}/${measureLength}個分)`);
            }
        });
    });

    if (feedback.length > 0) {
        const fullMsg = `【リズムのズレがあります（設定: ${scoreSettings.meter}）】\n\n` + feedback.join('\n');
        if (!isSilent) alert(fullMsg);
        return { ok: false, msg: fullMsg };
    }

    // 合格なら終止線を自動付与（前回の提案機能）
    finalizeScore();
    
    if (!isSilent) alert(`リズムチェックOK！（${scoreSettings.meter}）`);
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
    // ヘッダーを除去し、音符と小節線だけに絞る
    swing: `(3DEF (3GAB (3cBA (3GFE | C8 |]`,
    basic_chord: `[CEGB]4 [DFAc]4 | [G B d f]8 |]`,
    bossa: `[CEGB]2 [CEGB]2 z [CEGB]3 | [DFAc]8 |]`
};

/**
 * 名前を指定してサンプルを適用する
 */
function applySample(key) {
    const notes = SAMPLES[key];
    if (!notes) return;

    if (confirm("入力欄の内容が上書きされます。よろしいですか？")) {
        // サンプルに合わせて設定を強制同期（これでリズムチェックが通るようになる）
        if (key === 'bossa') {
            scoreSettings.meter = "4/4";
            scoreSettings.tempo = "120";
            scoreSettings.swing = false; // ボサノバはStraight
        } else {
            scoreSettings.meter = "4/4";
            scoreSettings.tempo = "130";
            scoreSettings.swing = true;
        }

        // 入力欄を更新し、小節カウントもリセット
        input.value = notes;
        measureCount = 0; 
        
        // 全体を再描画
        render();
        
        // ヘルプを閉じる
        document.querySelector('details').open = false;
    }
}

/**
 * 保存ボタン：実行前にチェックを強制する
 */
async function saveAsImage() {
    const rawValue = input.value.trim();
    if (rawValue === "") {
        alert("保存する音符が入力されていません。");
        return;
    }
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

/**
 * ページ読み込み時にチュートリアルの表示判定を行う
 */
document.addEventListener("DOMContentLoaded", () => {
    const hasSeenTutorial = localStorage.getItem("hasSeenJazzTutorial");
    const overlay = document.getElementById("tutorial-overlay");
    
    if (hasSeenTutorial) {
        // すでに見たことがある場合は最初から非表示にする
        if (overlay) overlay.style.display = "none";
    }
});

/**
 * チュートリアルを閉じて、次回から出ないように記憶する
 */
function closeTutorial() {
    const overlay = document.getElementById("tutorial-overlay");
    if (overlay) {
        overlay.style.opacity = "0";
        setTimeout(() => {
            overlay.style.display = "none";
        }, 300); // フェードアウト後に完全に消す
    }
    // ブラウザに「もう見たよ」というフラグを保存
    localStorage.setItem("hasSeenJazzTutorial", "true");
}

// 小節数をカウントする変数
let measureCount = 0;

/**
 * 小節線を挿入し、4小節ごとに自動改行する
 */
function insertMeasureLine() {
    measureCount++;
    let textToInsert = "| ";
    
    if (measureCount % 4 === 0) {
        textToInsert = "|\n";
    }
    
    // insertTextを呼び出すことで、カーソル位置の制御を共通化
    insertText(textToInsert);
}

/**
 * スラーの開始・終了やタイを挿入する
 */
function insertArticulation(symbol) {
    // スラーの開始「(」やタイ「-」は音符に密着させるため、スペースなしで挿入
    insertText(symbol);
}