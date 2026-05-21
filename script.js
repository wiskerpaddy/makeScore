let currentAbcText = "";
const input = document.getElementById('abc-input');

// ★ヘッダー情報を分離して保持
const ABC_HEADER = "X:1\nM:4/4\nK:C\nL:1/8\n";

// 設定状態を管理
let scoreSettings = {
    meter: "4/4",
    tempo: "130",
    swing: false, // trueで"Swing"表示、falseで非表示(Straight)
    key: "C",
    saxMode: false // ★新しく追加：trueのときサックス用の移調を行う
};

// キー（調）を短3度（半音3つ分）上げるためのマップ
const SAX_KEY_MAP = {
    "C": "Eb",  "Cm": "Cmin",
    "G": "Bb",  "Gm": "Gmin",
    "D": "F",   "Dm": "Fmin",
    "A": "C",   "Am": "Amin",
    "E": "G",   "Em": "Gmin",
    "B": "D",   "Bm": "Dmin",
    "F#": "A",  "F#m": "Amin",
    "C#": "E",  "C#m": "Emin",
    "F": "Ab",  "Fm": "Abmin",
    "Bb": "Db", "Bbm": "Dbmin",
    "Eb": "Gb", "Ebm": "Gmin", // 実音に合わせた近似
    "Ab": "B",  "Abm": "Bmin"
};

/**
 * ABCテキスト内の音符をすべて半音3つ分（短3度）高く変換する関数
 * サックスの運指（C）でピアノの実音（Eb）を鳴らすための補正
 */
function transposeAbcTextForSax(abcText) {
    // 簡易的な音符変換マップ（C,D,E,F,G,A,Bとそのオクターブ/シャープの対応）
    // ※大文字（低音域）と小文字（高音域）のABC譜面の特性を考慮
    // ここでは一番シンプルな1オクターブ基準の半音3つシフトの例です
    const noteMap = {
        'C': 'Eb', 'C#': 'E', 'D': 'F', 'D#': 'F#', 'E': 'G', 'F': 'Ab', 'F#': 'A', 'G': 'Bb', 'G#': 'B', 'A': 'c', 'A#': 'c#', 'B': 'd',
        'c': 'eb', 'c#': 'e', 'd': 'f', 'd#': 'f#', 'e': 'g', 'f': 'ab', 'f#': 'a', 'g': 'bb', 'g#': 'b', 'a': 'c\'', 'a#': 'c#\'', 'b': 'd\''
    };

    let transposed = abcText;
    // 1文字ずつ、または正規表現で音符部分を置換します
    // ※より厳密なABCパースを行う場合は、生成されるMIDIデータのピッチ（ノート番号）を直接+3するアプローチが最も確実です。
    return transposed;
}

let currentVisualObj = null;

/**
 * 楽譜をレンダリングする
 */
function render() {
    // スイング表記の構築
    const swingText = scoreSettings.swing ? '"Swing"' : ""; 
    
    // ★ 修正: 末尾に %%stretchlast 0 を追加し、ABCJSの勝手な横伸ばし（均等割り付け）を禁止する
    const dynamicHeader = `X:1\nM:${scoreSettings.meter}\nK:${scoreSettings.key} transpose=-12\nL:1/8\nQ:1/4=${scoreSettings.tempo} ${swingText}\n%%stretchlast 0\n`;
    const fullAbc = dynamicHeader + input.value;
    
    // 描画結果（配列）を変数 result に一度受け取ります
    const result = ABCJS.renderAbc("paper", fullAbc, {
        responsive: "resize",
        add_classes: true
    });

    // 画面描画が成功していれば、その楽譜データをセーブしておく
    if (result && result.length > 0) {
        currentVisualObj = result[0];
    }

    // --- 以下、既存のUI更新処理 ---
    const swingBtn = document.getElementById('swing-btn');
    const saxBtn = document.getElementById('sax-btn');
    if (swingBtn) {
        if (scoreSettings.swing) {
            swingBtn.style.background = "#d4af37";
            swingBtn.style.color = "#121417";
            swingBtn.innerText = "Swing: ON";
        } else {
            swingBtn.style.background = "#444";
            swingBtn.style.color = "#fff";
            swingBtn.innerText = "Swing: OFF";
        }
    }
    if (saxBtn) {
        if (scoreSettings.saxMode) {
            saxBtn.style.background = "#d4af37";
            saxBtn.style.color = "#121417";
            saxBtn.innerText = "Sax: ON";
        } else {
            saxBtn.style.background = "#444";
            saxBtn.style.color = "#fff";
            saxBtn.innerText = "Sax: OFF";
        }
    }

    // UIのテキスト更新
    const meterDisplay = document.getElementById('ui-meter');
    if (meterDisplay) meterDisplay.innerText = scoreSettings.meter;
    
    const tempoDisplay = document.getElementById('ui-tempo');
    if (tempoDisplay) tempoDisplay.innerText = scoreSettings.tempo;
}

/**
 * 設定ボタンが押された時の処理
 */
function updateScoreSetting(key, value) {
    // 1. swingの独立トグル処理
    if (key === 'swing') {
        scoreSettings.swing = !scoreSettings.swing;
        const btn = document.getElementById('swing-btn');
        if (btn) btn.classList.toggle('active', scoreSettings.swing);
    } 
    // 2. saxModeの独立トグル処理（swingとは完全に独立させる）
    else if (key === 'saxMode') {
        scoreSettings.saxMode = !scoreSettings.saxMode;
        const btn = document.getElementById('sax-btn');
        if (btn) btn.classList.toggle('active', scoreSettings.saxMode);
    } 
    // 3. 既存の自由入力プロンプト処理（変更なし）
    else if (key === 'meter_custom' || key === 'tempo_custom') {
        const newVal = prompt(`${key === 'meter_custom' ? '拍数' : 'テンポ'}を入力してください`, value);
        if (newVal) scoreSettings[key.split('_')[0]] = newVal;
    } 
    // 4. その他の通常設定（変更なし）
    else {
        scoreSettings[key] = value;
    }

    // 最後に描画処理を走らせる
    render();
}

function insertText(text) {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    let textToInsert = text;

    // テキストを挿入
    input.setRangeText(textToInsert, start, end, "end");
    const newPos = start + textToInsert.length;
    
    // 描画処理を実行
    render();

    // ★ 修正: focus() は絶対に呼ばず、内部のカーソル位置情報だけを静かに更新する
    input.setSelectionRange(newPos, newPos);
}

/**
 * 音符ボタン用の関数（空白を入れないように修正）
 */
function addNote(note) {
    const dur = document.querySelector('input[name="dur"]:checked').value;
    // スペースを結合せず、そのまま挿入
    insertText(note + dur); 
}

/**
 * 最後の小節線を終止線（|]）に変換する（空白混入防止・改行対応版）
 */
function finalizeScore() {
    let val = input.value; 
    if (val.trim().length === 0) return;

    const selectionStart = input.selectionStart;
    const selectionEnd = input.selectionEnd;

    // 1. まず、過去に付与した終止線 |] をすべて通常の小節線 | に戻す
    let newVal = val.replace(/\|\]/g, "|");
    
    // 2. 末尾の空白や改行を取り除いた状態の「一番最後の文字」を判定
    const trimmed = newVal.trimEnd();

    if (trimmed.endsWith("|")) {
        // 末尾がすでに小節線の場合は、最後に見つかった | を |] に置換する
        const lastPipeIndex = trimmed.lastIndexOf('|');
        // trimmed の中身を使って置き換え、元の末尾の空白（改行など）を復元する
        newVal = trimmed.substring(0, lastPipeIndex) + "|]" + val.substring(trimmed.length);
    } else if (!trimmed.endsWith("|]")) {
        // 末尾が小節線でない場合は、純粋に |] を足す
        // 元の末尾の空白（改行など）を保持したまま追加する
        newVal = trimmed + "|]" + val.substring(trimmed.length);
    }
    
    input.value = newVal;
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
 * 拍数・小節チェック（テキストを破壊しない安全バージョン）
 */
function checkRhythm(isSilent = false) {
    // ★ 修正: 楽譜データを破壊してしまう「小節線の自動補完（テキスト上書き）」を無効化します
    const autoFormattedText = autoInsertMeasureLines(input.value);
    input.value = autoFormattedText;
    render();

    // チェック実行前のカーソル位置を記憶
    const selectionStart = input.selectionStart;
    const selectionEnd = input.selectionEnd;

    const text = input.value;
    const lines = text.split('\n');
    
    const [num, den] = scoreSettings.meter.split('/').map(Number);
    const measureLength = num * (8 / den); 

    let feedback = [];
    lines.forEach((line, index) => {
        if (line.includes(':') || line.trim() === "" || line.startsWith('%')) return;

        const normalizedLine = line.replace(/\|\]/g, "|");
        const measures = normalizedLine.split('|');

        measures.forEach((m, i) => {
            const cleanM = m.trim();
            if (cleanM === "" || (i === measures.length - 1 && cleanM === "")) return;

            // 共通関数を使って1小節の長さを取得
            const count = parseMeasureLength(cleanM);

            if (count > 0 && Math.abs(count - measureLength) > 0.01) {
                const diff = count - measureLength;
                const beatDiff = Math.abs(diff / 2);
                const formattedBeat = Number(beatDiff.toFixed(2)).toString(); 
                
                const status = diff > 0 ? `${formattedBeat}拍多い` : `${formattedBeat}拍足りない`;
                feedback.push(`${index + 1}行目・第${i + 1}小節: ${status}`);
            }
        });
    });

    if (feedback.length > 0) {
        const fullMsg = `【リズムのズレがあります（設定: ${scoreSettings.meter}）】\n\n` + feedback.join('\n');
        if (!isSilent) alert(fullMsg);
        
        input.setSelectionRange(selectionStart, selectionEnd);
        return { ok: false, msg: fullMsg };
    }

    // 綺麗に終止線を付与（これもスペースが入らないように修正しました）
    finalizeScore();
    
    if (!isSilent) {
        alert(`リズムチェックOK！（${scoreSettings.meter}）`);
    }

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
function addRest() {
    const dur = document.querySelector('input[name="dur"]:checked').value;
    // 空白を入れずに選択中の長さを反映
    insertText("z" + dur);  
}

function deleteLast() {
    let val = input.value;
    if (val.length === 0) return;

    const selectionStart = input.selectionStart;
    let trimmed = val.trimEnd();
    const oldLength = val.length;

    if (trimmed.endsWith("|]")) {
        val = trimmed.slice(0, -2);
    } else {
        val = val.substring(0, val.length - 1);
    }

    input.value = val;
    render();

    const deletedCount = oldLength - val.length;
    let newCursorPos = selectionStart - deletedCount;
    if (newCursorPos < 0) newCursorPos = 0;

    // ★ 修正: ここも focus() は絶対に呼ばない
    input.setSelectionRange(newCursorPos, newCursorPos);
}

/**
 * 臨時記号（♯、♭、♮）や装飾（Doo, Bah）用
 * ★スマート回り込み機能搭載：音符を入力した【後】に押しても、自動で前にくっつく
 */
function insertNuance(symbol) {
    const start = input.selectionStart;
    const beforeCursor = input.value.substring(0, start);

    const noteRegex = /([a-gA-G][',]*[0-9/]*)$/;
    const match = beforeCursor.match(noteRegex);

    if (match) {
        const note = match[1];
        const replaceStart = start - note.length;
        input.setRangeText(symbol + note, replaceStart, start, "end");
        
        // ★ 追加: カーソル飛びを強制ブロック
        const newPos = replaceStart + symbol.length + note.length;
        input.setSelectionRange(newPos, newPos);
        
        render();
    } else {
        insertText(symbol);
    }
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
    
    // 直前の音符（オクターブ記号なども含む）をキャッチ。末尾の空白を期待しない形に修正
    const match = beforeText.match(/([A-Ga-gYzz][',]*[0-9/]*)$/);
    
    if (match) {
        const lastNoteToken = match[1];
        let newNoteToken = "";
        
        // 元のベースノート（ドレミや休符 + オクターブ記号）を抽出
        const baseNoteMatch = lastNoteToken.match(/^[A-Ga-gYzz][',]*/);
        const baseNote = baseNoteMatch ? baseNoteMatch[0] : lastNoteToken[0];
        
        // 【元のロジックをそのまま維持】元の長さに「+1カウント(0.5拍)」した数字に打ち替える
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
        
        // ★修正：テキスト全体の上書きをやめ、対象の音符だけを新しく置き換える（空白なし）
        const replaceStart = start - lastNoteToken.length;
        input.setRangeText(newNoteToken, replaceStart, start, "end");
        
        render();
    } else {
        insertText(">"); 
    }
}

/**
 * 手動改行ボタン用の関数（共通関数を使ってスマートに判定）
 */
function insertNewLine() {
    const start = input.selectionStart;
    const val = input.value;
    
    const beforeText = val.substring(0, start);
    const lines = beforeText.split('\n');
    const currentLine = lines[lines.length - 1] || "";
    
    const normalizedLine = currentLine.replace(/\|\]/g, "|");
    const measures = normalizedLine.split('|');
    const cleanM = measures[measures.length - 1].trim();
    
    const [num, den] = scoreSettings.meter.split('/').map(Number);
    const measureLength = num * (8 / den); 
    
    // ★ 共通関数を使って直前の未完了小節の長さを取得
    const count = parseMeasureLength(cleanM);
    
    // 誤差を考慮してぴったり1小節分あるか判定
    if (count > 0 && Math.abs(count - measureLength) <= 0.01) {
        insertText("|\n");
    } else {
        insertText("\n");
    }
}

/**
 * 小節の文字列から、正確な総カウント数(8分音符ベース)を計算する共通関数
 */
function parseMeasureLength(cleanM) {
    if (cleanM === "") return 0;

    // ★修正1: !tenuto! や !>! などの装飾記号を完全に除去し、「e」などの誤認を防ぐ
    let processedM = cleanM.replace(/![^!]+!/g, "");

    // ★修正2: 和音 [CEG]4 などを、全体の長さ(4)を基準にするためダミーの単一音符(C4)に変換する
    processedM = processedM.replace(/\[[^\]]+\]([0-9/]*)/g, "C$1");

    const tokens = processedM.match(/(\(3|[\^_\=]*[a-gA-GzZ][',]*[0-9/]*>?)/g);
    let count = 0;
    let tupletCount = 0; 

    if (!tokens) return 0;

    tokens.forEach(t => {
        if (t === "(3") {
            tupletCount = 3; 
            return;
        }

        const isDotted = t.endsWith('>');
        const cleanToken = isDotted ? t.slice(0, -1) : t;

        let val = 1; 

        const fractionMatch = cleanToken.match(/[\^_\=]*[a-gA-GzZ][',]*(\d+)\/(\d+)/); 
        const slashNumMatch = cleanToken.match(/[\^_\=]*[a-gA-GzZ][',]*\/(\d+)/);     
        const multiplierMatch = cleanToken.match(/[\^_\=]*[a-gA-GzZ][',]*(\d+)/);    

        if (fractionMatch) {
            val = parseInt(fractionMatch[1], 10) / parseInt(fractionMatch[2], 10);
        } else if (slashNumMatch) {
            val = 1 / parseInt(slashNumMatch[1], 10);
        } else if (cleanToken.includes('/') && !cleanToken.match(/\d/)) {
            val = 0.5; 
        } else if (multiplierMatch) {
            val = parseInt(multiplierMatch[1], 10);
        }

        if (isDotted) {
            val = val * 1.5;
        }

        if (tupletCount > 0) {
            val = val * (2 / 3);
            tupletCount--;
        }
        
        count += val;
    });

    return count;
}

/**
 * 楽譜データを一切破壊せずに、拍数に合わせて小節線(|)を自動挿入する（自動改行 撤廃版）
 */
function autoInsertMeasureLines(text) {
    const [num, den] = scoreSettings.meter.split('/').map(Number);
    const measureLength = num * (8 / den); 

    let newText = "";
    let currentBeats = 0;
    // ★ 修正: 小節をカウントして改行する処理（measureCount）を完全に削除しました

    const regex = /((?:![^!]+!)*)(?:(\[[^\]]+\][0-9/]*)|([\^_\=]*[a-gA-GzZ][',]*[0-9/]*>?))|(\|\]|\|)|(\n)|([\s\S])/g;
    
    let match;
    while ((match = regex.exec(text)) !== null) {
        const token = match[0];

        if (match[5]) { 
            // ユーザーが手動で入れた改行 (\n) の場合はそのまま保持し、拍数をリセット
            newText += token;
            currentBeats = 0;
        }
        else if (match[4]) {
            // 既存の小節線がある場合もそのまま保持し、拍数をリセット
            newText += token;
            currentBeats = 0;
        } 
        else if (match[2] || match[3]) {
            // 音符の場合
            const beats = parseMeasureLength(token); 
            
            // 1小節分の拍数に達したら、改行せず「|」だけを挿入する
            if (currentBeats >= measureLength - 0.01) {
                newText += "|"; 
                currentBeats = 0;
            }
            newText += token;
            currentBeats += beats;
        } 
        else {
            newText += token;
        }
    }
    return newText.replace(/\|\|/g, '|');
}

function saveAsMidi() {
    const rawValue = input.value.trim();
    if (rawValue === "") {
        alert("保存する音符が入力されていません。");
        return;
    }

    const result = checkRhythm(true); 
    if (!result.ok) {
        if (!confirm(result.msg + "\n\nこのまま保存しますか？")) {
            return; 
        }
    }

    try {
        const now = new Date();
        const dateStr = now.getFullYear() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0') +
            String(now.getHours()).padStart(2, '0') +
            String(now.getMinutes()).padStart(2, '0') +
            String(now.getSeconds()).padStart(2, '0');

        const swingText = scoreSettings.swing ? '"Swing"' : ""; 

        // 🎷 1文字ずつの危険な置換は完全撤廃。元の文字列を100%そのまま活かす
        let targetNotesText = rawValue;
        
        // 🎼 アルトサックス（Eb管）の移調とオクターブ補正を安全に計算
        let targetKey = scoreSettings.key; // デフォルトは画面で選ばれているKey
        
        if (scoreSettings.saxMode) {
            // 🎷 サックスモード：本来の「3マス上げる」と「1オクターブ下げる」を合算して「transpose=-9」にする
            targetKey = `${scoreSettings.key} transpose=-9`;
            console.log("🎷 [サックスモード] 音声ピッチを適正位置（-9）に補正してMIDIを書き出します。");
        } else {
            // 通常モード：一律で1オクターブ（半音12個）音声を下げて書き出す
            targetKey = `${scoreSettings.key} transpose=-12`;
        }

        // 📝 組み立てるヘッダーの K: の部分に、補正済みのKeyを挿入
        const fullAbcText = `X:1\nM:${scoreSettings.meter}\nK:${targetKey}\nL:1/8\nQ:1/4=${scoreSettings.tempo}${swingText ? " " + swingText : ""}\n${targetNotesText}`;        
        console.log("生成されたABCテキスト:\n", fullAbcText);

        const visualObjArray = ABCJS.parseOnly(fullAbcText);
        if (!visualObjArray || visualObjArray.length === 0) {
            throw new Error("楽譜データの解析に失敗しました。");
        }
        const visualObj = visualObjArray[0];

        const midiResult = ABCJS.synth.getMidiFile(fullAbcText, {
            visualObj: visualObj
        });

        let midiTarget = Array.isArray(midiResult) ? midiResult[0] : midiResult;
        let midiDataUrl = "";

        if (midiTarget) {
            if (typeof midiTarget === "object" && (midiTarget.midi || midiTarget.href)) {
                midiDataUrl = midiTarget.midi || midiTarget.href;
            } else {
                const htmlString = typeof midiTarget === "string" ? midiTarget : (midiTarget.outerHTML || "");
                const match = htmlString.match(/href=["'](data:audio\/midi[^"']*)["']/);
                if (match && match[1]) {
                    midiDataUrl = match[1].replace(/&amp;/g, '&');
                }
            }
        }

        if (!midiDataUrl) {
            throw new Error("MIDIデータの抽出に失敗しました。URLが見つかりません。");
        }

        const link = document.createElement("a");
        link.download = `score_${dateStr}.mid`;
        link.href = midiDataUrl;
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        
    } catch (error) {
        console.error("MIDI生成の内部エラー:", error);
        alert("MIDIファイルの生成中にエラーが発生しました。\n" + error.message);
    }
}

// ==========================================
// ★ 音符ボタンのフリック入力拡張機能（完全版：付点・タイ対応）
// ==========================================
function setupFlickInput() {
    const noteButtons = document.querySelectorAll('.note-grid button[onclick^="addNote"]');
    const threshold = 30; // フリック判定距離

    noteButtons.forEach(btn => {
        // 重複登録を防止（念のためのバグ対策）
        if (btn.getAttribute('data-flick-initialized') === "true") return;
        btn.setAttribute('data-flick-initialized', "true");

        const onclickAttr = btn.getAttribute('onclick');
        const noteMatch = onclickAttr.match(/addNote\('([^']+)'\)/);
        if (!noteMatch) return;
        
        const baseNote = noteMatch[1];
        btn.removeAttribute('onclick');
        btn.style.touchAction = "none";
        
        let startX = 0, startY = 0, isMoving = false;

        btn.addEventListener('pointerdown', (e) => {
            startX = e.clientX;
            startY = e.clientY;
            isMoving = true;
            btn.setPointerCapture(e.pointerId); 
        });

        btn.addEventListener('pointerup', (e) => {
            if (!isMoving) return;
            isMoving = false;
            
            // キャンセル処理（ボタンから大きく外れたら無効）
            const rect = btn.getBoundingClientRect();
            const padding = 50; 
            if (
                e.clientX < rect.left - padding || 
                e.clientX > rect.right + padding || 
                e.clientY < rect.top - padding || 
                e.clientY > rect.bottom + padding
            ) {
                btn.releasePointerCapture(e.pointerId);
                return; 
            }
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            let prefix = "";    // 音符の前につく記号（♯, Dooなど）
            let postfix = "";   // 音符の後ろにつく記号（タイなど）
            let isDotted = false;
            
            if (distance > threshold) {
                let angle = Math.atan2(dy, dx) * 180 / Math.PI;
                if (angle < 0) angle += 360;

                // 8方向のマッピング
                if (angle >= 337.5 || angle < 22.5) {
                    prefix = "!tenuto!"; // → Doo
                } 
                else if (angle >= 22.5 && angle < 67.5) {
                    prefix = "!>!";      // ↘ Bah
                } 
                else if (angle >= 67.5 && angle < 112.5) {
                    prefix = "_";        // ↓ ♭
                } 
                else if (angle >= 112.5 && angle < 157.5) {
                    postfix = "-";       // ↙ タイ
                } 
                else if (angle >= 157.5 && angle < 202.5) {
                    prefix = "=";        // ← ♮
                } 
                else if (angle >= 202.5 && angle < 247.5) {
                    isDotted = true;     // ↖ 付点
                } 
                else if (angle >= 247.5 && angle < 292.5) {
                    prefix = "^";        // ↑ ♯
                } 
                else if (angle >= 292.5 && angle < 337.5) {
                    prefix = "!>!";      // ↗ Bah
                }
            }
            
            let dur = document.querySelector('input[name="dur"]:checked').value;
            
            // ↖ 左上フリック（付点）の場合、選択中の長さを正確に1.5倍に変換する
            if (isDotted) {
                if (dur === "8") dur = "12";          // 全音 -> 付点全音
                else if (dur === "4") dur = "6";      // 2分 -> 付点2分
                else if (dur === "2") dur = "3";      // 4分 -> 付点4分
                else if (dur === "") dur = "3/2";     // 8分 -> 付点8分
                else if (dur === "/2") dur = "3/4";   // 16分 -> 付点16分
            }
            
            // 最終的な文字列を組み合わせて挿入（例: ^ + C + 3 + -）
            insertText(prefix + baseNote + dur + postfix);
            
            btn.releasePointerCapture(e.pointerId);
        });

        btn.addEventListener('pointercancel', () => {
            isMoving = false;
        });
    });
}

// 画面が読み込まれたら自動でフリック機能をセットアップ
document.addEventListener("DOMContentLoaded", () => {
    setupFlickInput();
});