const input = document.getElementById('abc-input');

/**
 * 楽譜をレンダリングする
 */
function render() {
    ABCJS.renderAbc("paper", input.value, {
        responsive: "resize",
        add_classes: true
    });
}

/**
 * テキストを指定位置に挿入する
 */
function insertText(text) {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const val = input.value;
    input.value = val.substring(0, start) + text + val.substring(end);
    
    input.focus();
    input.selectionStart = input.selectionEnd = start + text.length;
    render();
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