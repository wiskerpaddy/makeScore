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