const input = document.getElementById('abc-input');

// ★ヘッダー情報を分離して保持
const ABC_HEADER = "X:1\nM:4/4\nK:C\nL:1/8\n";

// 設定状態を管理
let scoreSettings = {
    meter: "4/4",
    tempo: "130",
    swing: false, // trueで"Swing"表示、falseで非表示(Straight)
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
 * テキストエリアのカーソル位置に安全に文字を挿入する（スペース完全自動化版）
 */
function insertText(text) {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const currentVal = input.value;

    // 挿入する文字の末尾にスペースがなければ、自動的に半角スペースを1つ追加する
    // ただし、すでに末尾がスペースの場合や特殊記号の場合は除く
    let textToInsert = text;
    if (!textToInsert.endsWith(' ') && !textToInsert.endsWith('\n')) {
        textToInsert = textToInsert + ' ';
    }

    // カーソル位置にテキストを挿入
    input.value = currentVal.substring(0, start) + textToInsert + currentVal.substring(end);

    // カーソル位置を挿入した文字のすぐ後ろに移動
    const newPos = start + textToInsert.length;
    input.focus();
    input.setSelectionRange(newPos, newPos);

    // 楽譜を再描画
    render();
}

/**
 * 音符ボタン用の関数（末尾にスペースを入れるなど調整）
 */
function addNote(note) {
    const dur = document.querySelector('input[name="dur"]:checked').value;
    insertText(note + dur + " ");
}

/**
 * 最後の小節線を終止線（|]）に変換する
 */
function finalizeScore() {
    let val = input.value; // トリムすると文字数がズレてカーソル位置が狂うためそのまま扱う
    if (val.trim().length === 0) return;

    // ★ 1. 書き換え前のカーソル位置を記憶
    const selectionStart = input.selectionStart;
    const selectionEnd = input.selectionEnd;

    // 文字列のどこかに残ってしまった古い終止線 "|]" をすべて通常の小節線 "|" に戻す
    let newVal = val.replace(/\|\]/g, "|");

    // 末尾のスペースや改行を考慮し、実質的な末尾が "|" で終わっているか判定
    const trimmed = newVal.trimEnd();
    if (trimmed.endsWith("|")) {
        // 末尾の "|" を "|]" に置換（元の末尾の改行やスペースは維持する）
        const lastPipeIndex = newVal.lastIndexOf('|');
        newVal = newVal.substring(0, lastPipeIndex) + "|]" + newVal.substring(lastPipeIndex + 1);
    } else if (!trimmed.endsWith("|]")) {
        // 小節線が何もなければ末尾に足す
        newVal = newVal.trimEnd() + " |]";
    }
    
    // ★ 2. テキストエリアの値を更新（ここでカーソルが一度先頭に飛びます）
    input.value = newVal;
    
    // ★ 3. 記憶していたカーソル位置を完全に復元
    input.setSelectionRange(selectionStart, selectionEnd);
    
    render();
}

/**
 * 音符トークンから正確な長さを取得する（付点・分数対応版）
 */
function getNoteLength(noteStr) {
    // デフォルトは8分音符（長さ 1）
    let length = 1; 

    // 連符 (3 のようなものは除外する
    if (noteStr.startsWith('(3')) {
        return 0; 
    }

    // 「音名 + 数字」のパターンをパース（例: C4, C6, C3）
    const matchMultiplier = noteStr.match(/([A-Ga-gYzz])(\d+)/);
    // 「音名 + 分数」のパターンをパース（例: C3/2, C3/4）
    const matchFraction = noteStr.match(/([A-Ga-gYzz])(\d+)\/(\d+)/);
    // 「音名 + スラッシュのみ」のパターンをパース（例: C/2）
    const matchSlash = noteStr.match(/([A-Ga-gYzz])\/(\d+)/);

    if (matchFraction) {
        // C3/2 のような分数表記の場合 (3 分割して 2 で割る = 1.5)
        const numerator = parseInt(matchFraction[2], 10);
        const denominator = parseInt(matchFraction[3], 10);
        length = numerator / denominator;
    } else if (matchSlash) {
        // C/2 のような表記の場合 (1 / 2 = 0.5)
        length = 1 / parseInt(matchSlash[2], 10);
    } else if (matchMultiplier) {
        // C4 や C6 のような単純な倍数の場合
        length = parseInt(matchMultiplier[2], 10);
    } else if (noteStr.includes('/')) {
        // 数字なしのスラッシュ単体「/」は 1/2 とみなす
        length = 0.5;
    }

    return length;
}

/**
 * 拍数・小節チェック（スラッシュ・付点切り出しバグ完全修正版）
 */
function checkRhythm(isSilent = false) {
    // 1. チェック実行前のカーソル位置を記憶
    const selectionStart = input.selectionStart;
    const selectionEnd = input.selectionEnd;

    const text = input.value;
    const lines = text.split('\n');
    
    // 現在の設定から1小節の長さを取得 (L:1/8換算、4/4なら 4 * 2 = 8カウント)
    const [num, den] = scoreSettings.meter.split('/').map(Number);
    const measureLength = num * (8 / den); 

    let feedback = [];
    lines.forEach((line, index) => {
        if (line.includes(':') || line.trim() === "" || line.startsWith('%')) return;

        // 終止線 "|]" を一時的に通常の小節線 "|" に置換
        const normalizedLine = line.replace(/\|\]/g, "|");
        const measures = normalizedLine.split('|');

        measures.forEach((m, i) => {
            const cleanM = m.replace(/\[.*?\]/g, "").trim();
            if (cleanM === "" || (i === measures.length - 1 && cleanM === "")) return;

            // 【最重要修正】スラッシュ「/」も含めて音符トークンを厳密に抽出する正規表現に修正
            const tokens = cleanM.match(/(\(3|[a-gA-GzZ][0-9/]*)/g);
            let count = 0;
            let tupletCount = 0; 

            if (tokens) {
                tokens.forEach(t => {
                    if (t === "(3") {
                        tupletCount = 3; 
                        return;
                    }

                    // 末尾に付点マーク「>」があるかあらかじめチェック
                    const isDotted = t.endsWith('>');
                    // 計算用に対象トークンから「>」を一時的に除去
                    const cleanToken = isDotted ? t.slice(0, -1) : t;

                    // 【差し替え】 tokens.forEach(t => { ... }) のすぐ内側の数値変換処理
                    let val = 1; // デフォルトは1（8分音符）

                    // 1. 分数表記 (例: C3/2 などの付点)
                    const fractionMatch = t.match(/([a-zA-Z])(\d+)\/(\d+)/);
                    // 2. スラッシュ数値表記 (例: C/2)
                    const slashNumMatch = t.match(/([a-zA-Z])\/(\d+)/);
                    // 3. 単純な乗算表記 (例: C2, C4, C6)
                    const multiplierMatch = t.match(/([a-zA-Z])(\d+)/);

                    if (fractionMatch) {
                        // 分数がある場合は 分子 ÷ 分母 (3/2 なら 1.5)
                        val = parseInt(fractionMatch[2], 10) / parseInt(fractionMatch[3], 10);
                    } else if (slashNumMatch) {
                        val = 1 / parseInt(slashNumMatch[2], 10);
                    } else if (t.includes('/') && !t.match(/\d/)) {
                        val = 0.5; // 数字なしのスラッシュ単体
                    } else if (multiplierMatch) {
                        val = parseInt(multiplierMatch[2], 10); // 純粋な倍数
                    }

                    if (tupletCount > 0) {
                        val = val * (2 / 3);
                        tupletCount--;
                    }

                    count += val;
                });
            }
            // 誤差を考慮して厳密に判定（浮動小数点対策）
            if (count > 0 && Math.abs(count - measureLength) > 0.01) {
                const diff = count - measureLength;
                // カウント数(8分音符ベース)を、直感的な「拍数」に変換（÷2）
                const beatDiff = Math.abs(diff / 2);
                // 小数点第2位まで丸め、綺麗に整形
                const formattedBeat = Number(beatDiff.toFixed(2)).toString(); 
                
                const status = diff > 0 ? `${formattedBeat}拍多い` : `${formattedBeat}拍足りない`;
                feedback.push(`${index + 1}行目・第${i + 1}小節: ${status}`);
            }
        });
    });

    if (feedback.length > 0) {
        const fullMsg = `【リズムのズレがあります（設定: ${scoreSettings.meter}）】\n\n` + feedback.join('\n');
        if (!isSilent) alert(fullMsg);
        
        input.focus();
        input.setSelectionRange(selectionStart, selectionEnd);
        return { ok: false, msg: fullMsg };
    }

    // リズムが正常な場合のみ終止線を付与
    finalizeScore();
    
    if (!isSilent) {
        alert(`リズムチェックOK！（${scoreSettings.meter}）`);
    }

    input.focus();
    input.setSelectionRange(selectionStart, selectionEnd);

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
function addNote(note) {
    const dur = document.querySelector('input[name="dur"]:checked').value;
    insertText(note + dur + " "); // ★末尾に " " を追加
}

function addRest() {
    const dur = document.querySelector('input[name="dur"]:checked').value;
    insertText("z" + dur + " ");  // ★末尾に " " を追加
}

/**
 * 消去ボタン：末尾のトークンまたは小節線を安全に削除（カーソル位置完全保持版）
 */
function deleteLast() {
    let val = input.value;
    if (val.length === 0) return;

    // ★ 1. 実行前のカーソル位置を記憶
    const selectionStart = input.selectionStart;
    const selectionEnd = input.selectionEnd;

    // 削除前のトリム状態を取得
    let trimmed = val.trimEnd();

    // ★ 終止線（|]）で終わっている場合は、まとめて削除できるように調整
    if (trimmed.endsWith("|]")) {
        // 末尾の "|]" をごっそり削除
        val = trimmed.slice(0, -2);
    } else {
        // 通常の1文字消去（またはスペースを考慮した消去）
        val = val.substring(0, val.length - 1);
    }

    // ★ 2. テキストエリアを更新（ここでカーソルが先頭に飛ぶ）
    input.value = val;

    // ★ 3. 削除された文字数を計算し、カーソル位置を正しくスライドさせて復元
    // 基本は元の位置を維持ですが、末尾を消した場合はみ出さないように調整
    const newCursorPos = Math.min(selectionStart, val.length);
    
    input.focus();
    input.setSelectionRange(newCursorPos, newCursorPos);

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
    // 終止線 |] を一時的に除外して純粋な小節線だけにする
    const cleanText = input.value.replace(/\|\]/g, "");
    
    // 改行で区切り、ユーザーが現在入力している「最後の行」を取り出す
    const lines = cleanText.split('\n');
    const currentLine = lines[lines.length - 1] || "";

    // 現在の行にある小節線「|」の数をカウント
    const currentMatches = currentLine.match(/\|/g);
    const currentCount = currentMatches ? currentMatches.length : 0;

    let textToInsert = "| ";
    
    // 現在の行の小節線が3つ（次が4つ目）の時に改行を入れる
    if ((currentCount + 1) % 4 === 0) {
        textToInsert = "|\n";
    }
    
    insertText(textToInsert);
}

/**
 * スラーの開始・終了やタイを挿入する
 */
function insertArticulation(symbol) {
    // スラーの開始「(」やタイ「-」は音符に密着させるため、スペースなしで挿入
    insertText(symbol);
}

/**
 * 選択中の音符の長さを1.5倍（付点）にしてテキストエリアに挿入する、
 * または直前の音符を賢く付点化する関数（スペース自動付与＆カーソル固定版）
 */
function insertDotMultiplier() {
    const start = input.selectionStart;
    const val = input.value;
    
    const beforeText = val.substring(0, start);
    const afterText = val.substring(start);
    
    const match = beforeText.match(/([A-Ga-gYzz][0-9/]*)\s*$/);
    
    if (match) {
        const lastNoteToken = match[1];
        let newNoteToken = "";
        const baseNote = lastNoteToken.match(/^[A-Ga-gYzz]/)[0];
        
        // 【正しい定義に変更】元の長さに「+1カウント(0.5拍)」した数字に打ち替える
        if (lastNoteToken.includes("4")) {
            newNoteToken = baseNote + "5";   // 2拍(4) + 0.5拍(1) = 2.5拍(5)
        } else if (lastNoteToken.includes("2")) {
            newNoteToken = baseNote + "3";   // 1拍(2) + 0.5拍(1) = 1.5拍(3)
        } else if (lastNoteToken.includes("/2")) {
            newNoteToken = baseNote + "2";   // 16分(0.5) + 0.5拍(1) = 1.5 (ここでは簡易的に2に補正)
        } else if (lastNoteToken.includes("8")) {
            newNoteToken = baseNote + "9";   // 4拍(8) + 0.5拍(1) = 4.5拍(9)
        } else {
            newNoteToken = baseNote + "3";   // 数字なし(1) + 0.5拍(1) = 1拍(2) ですが、既存の付点8分(1.5)の互換として3
        }
        
        const replacedBeforeText = beforeText.substring(0, beforeText.length - match[0].length) + newNoteToken + " ";
        input.value = replacedBeforeText + afterText;
        
        const newPos = replacedBeforeText.length;
        input.focus();
        input.setSelectionRange(newPos, newPos);
        
        render();
    } else {
        insertText("> ");
    }
}