
const piano = document.getElementById("piano");
const midiLog = document.getElementById("midiLog");
const clearMidiLog = document.getElementById("clearMidiLog");
const connectionStatus = document.getElementById("connectionStatus");
const hidKeys = document.getElementById("hidKeys");
const hidStatus = document.getElementById("hidStatus");

const activeNotes = new Set();
const activeKeys = new Set();

const noteNames = [
    "C", "C♯", "D", "D♯", "E", "F",
    "F♯", "G", "G♯", "A", "A♯", "B"
];


function createPiano() {
    piano.innerHTML = "";

    const keyboard = document.createElement("div");
    keyboard.className = "virtual-keyboard";

    const whiteNotes = [];
    const blackNotes = [];

    for (let note = 21; note <= 108; note++) {
        const pitch = note % 12;
        const octave = Math.floor(note / 12) - 1;

        const isBlack = [1, 3, 6, 8, 10].includes(pitch);

        const key = document.createElement("div");
        key.className = isBlack ? "piano-key black-key" : "piano-key white-key";
        key.dataset.note = note;
        key.dataset.black = isBlack ? "true" : "false";
        key.title = `${noteNames[pitch]}${octave} — MIDI ${note}`;

        if (!isBlack) {
            key.textContent = `${noteNames[pitch]}${octave}`;
            whiteNotes.push(key);
        } else {
            blackNotes.push({
                element: key,
                note: note
            });
        }

        keyboard.appendChild(key);
    }

    piano.innerHTML = "";
    piano.style.display = "block";
    piano.style.padding = "8px";
    piano.style.overflow = "hidden";

    keyboard.style.position = "relative";
    keyboard.style.display = "flex";
    keyboard.style.width = "100%";
    keyboard.style.height = "100%";
    keyboard.style.minHeight = "100px";
    keyboard.style.userSelect = "none";

    const whiteWidth = 100 / whiteNotes.length;

    whiteNotes.forEach((key, index) => {
        key.style.position = "absolute";
        key.style.left = `${index * whiteWidth}%`;
        key.style.width = `${whiteWidth}%`;
        key.style.top = "0";
        key.style.bottom = "0";
        key.style.zIndex = "1";
    });

    const blackWidth = whiteWidth * 0.62;

    blackNotes.forEach(({ element, note }) => {
        const previousWhiteCount = whiteNotes.filter(
            key => Number(key.dataset.note) < note
        ).length;

        element.style.position = "absolute";
        element.style.left =
            `${previousWhiteCount * whiteWidth - blackWidth / 2}%`;
        element.style.width = `${blackWidth}%`;
        element.style.height = "62%";
        element.style.top = "0";
        element.style.zIndex = "2";
    });

    piano.appendChild(keyboard);
}


function logMidi(message) {
    const line = document.createElement("div");
    line.textContent =
        `${new Date().toLocaleTimeString()}  ${message}`;

    midiLog.appendChild(line);

    while (midiLog.children.length > 300) {
        midiLog.removeChild(midiLog.firstChild);
    }

    midiLog.scrollTop = midiLog.scrollHeight;
}

function showMidiNote(note, velocity, isOn) {
    const key = piano.querySelector(`[data-note="${note}"]`);

    if (isOn) {
        activeNotes.add(note);
    } else {
        activeNotes.delete(note);
    }

    if (key) {
        const name = noteNames[note % 12];
        const octave = Math.floor(note / 12) - 1;
        const isBlack = [1, 3, 6, 8, 10].includes(note % 12);

        key.style.background = isOn
            ? "#168cff"
            : (isBlack ? "#172b46" : "#e8eef7");

        key.style.color = isOn
            ? "#ffffff"
            : (isBlack ? "#b9dfff" : "#24364d");

        if (isOn) {
            key.title = `${name}${octave} — Velocity ${velocity}`;
        } else {
            key.title = `${name}${octave} — MIDI ${note}`;
        }
    }
}

clearMidiLog.addEventListener("click", () => {
    midiLog.innerHTML = "";
    logMidi("MIDI LOG dibersihkan.");
});

window.addEventListener("keydown", (event) => {
    if (event.repeat) return;

    activeKeys.add(event.code);

    hidStatus.textContent = "Input terdeteksi";
    hidStatus.style.color = "#45df9b";

    hidKeys.textContent = Array.from(activeKeys).join("  |  ");
});

window.addEventListener("keyup", (event) => {
    activeKeys.delete(event.code);

    hidKeys.textContent = activeKeys.size
        ? Array.from(activeKeys).join("  |  ")
        : "Tidak ada tombol ditekan.";

    if (activeKeys.size === 0) {
        hidStatus.textContent = "Menunggu input";
        hidStatus.style.color = "";
    }
});

window.addEventListener("blur", () => {
    activeKeys.clear();
    hidKeys.textContent = "Tidak ada tombol ditekan.";
    hidStatus.textContent = "Menunggu input";
});


async function connectMIDI() {
    if (!navigator.requestMIDIAccess) {
        connectionStatus.textContent = "MIDI: Browser tidak mendukung";
        logMidi("Web MIDI tidak tersedia di browser ini.");
        return;
    }

    try {
        logMidi("Meminta akses MIDI...");
const midi = await navigator.requestMIDIAccess();
logMidi("DEBUG: Akses MIDI berhasil diperoleh.");

        let selectedInputId = "";
let scanTimer = null;
let userHasChosenInput = false;

        const oldSelector = document.getElementById("midiInputSelect");
        if (oldSelector) oldSelector.remove();

        connectionStatus.textContent = "MIDI: ";

        const selector = document.createElement("select");
        selector.id = "midiInputSelect";
        selector.style.marginLeft = "10px";
        selector.style.padding = "7px";
        selector.style.borderRadius = "5px";
        selector.style.background = "#0a1120";
        selector.style.color = "#e8f1ff";
        selector.style.border = "1px solid #315078";
        selector.style.maxWidth = "240px";

        connectionStatus.appendChild(selector);

        function connectSelectedInput() {
            for (const input of midi.inputs.values()) {
                input.onmidimessage = null;
            }

            const input = midi.inputs.get(selectedInputId);

            if (!input || input.state !== "connected") {
                connectionStatus.firstChild.textContent =
                    "MIDI: Belum Terhubung";
                return;
            }

            connectionStatus.firstChild.textContent = "MIDI: ";

            input.onmidimessage = (event) => {
                const [status, data1, data2] = event.data;
                const command = status & 0xF0;
                const channel = (status & 0x0F) + 1;

                if (command === 0x90 && data2 > 0) {
                    showMidiNote(data1, data2, true);
                    logMidi(
                        `Note ON | Ch ${channel} | Note ${data1} | Vel ${data2}`
                    );
                } else if (
                    command === 0x80 ||
                    (command === 0x90 && data2 === 0)
                ) {
                    showMidiNote(data1, 0, false);
                    logMidi(
                        `Note OFF | Ch ${channel} | Note ${data1}`
                    );
                } else if (command === 0xB0) {
                    logMidi(
                        `CC | Ch ${channel} | CC ${data1} | Value ${data2}`
                    );
                } else if (command === 0xE0) {
                    const pitchBend = (data2 << 7) | data1;
                    logMidi(
                        `Pitch Bend | Ch ${channel} | Value ${pitchBend}`
                    );
                } else {
                    logMidi(
                        `MIDI | Status ${status} | Data ${data1}, ${data2}`
                    );
                }
            };

            connectionStatus.firstChild.textContent = "MIDI: REY MIDI";
        }

        function updateInputs() {
            const inputs = Array.from(midi.inputs.values()).filter(
                input => input.state === "connected"
            );

            const previousValue = selectedInputId;
            selector.innerHTML = "";

            const placeholder = document.createElement("option");
            placeholder.value = "";
            placeholder.textContent = inputs.length
                ? "Pilih MIDI Input"
                : "Tidak ada MIDI Input";
            selector.appendChild(placeholder);

            inputs.forEach((input, index) => {
                const option = document.createElement("option");
                option.value = input.id;
                option.textContent = input.name || `MIDI Input ${index + 1}`;
                selector.appendChild(option);
            });

        if (inputs.some(input => input.id === previousValue)) {
    selectedInputId = previousValue;
} else if (inputs.length === 1 && !userHasChosenInput) {
    selectedInputId = inputs[0].id;
} else {
    selectedInputId = "";
}

            selector.value = selectedInputId;
            connectSelectedInput();

            if (inputs.length === 0) {
                connectionStatus.firstChild.textContent =
                    "MIDI: Belum Terhubung";
            }
        }

       selector.addEventListener("change", () => {
    userHasChosenInput = true;
    selectedInputId = selector.value;
    connectSelectedInput();
});

        midi.onstatechange = () => {
            updateInputs();
        };
      window.addEventListener("pagehide", () => {
    sessionStorage.setItem(
        "reyKeyLabUnloadDebug",
        "beforeunload terpanggil"
    );

    midi.onstatechange = null;

    for (const input of midi.inputs.values()) {
        input.onmidimessage = null;
        input.close();
    }
     for (const output of midi.outputs.values()) {
        output.close();
    }

    if (scanTimer !== null) {
        clearInterval(scanTimer);
    }
});

        updateInputs();

        // Periksa kembali daftar perangkat selama beberapa detik
        // setelah halaman dibuka.
        let attempts = 0;
        scanTimer = setInterval(() => {
            updateInputs();
            attempts++;

            if (attempts >= 10) {
                clearInterval(scanTimer);
                scanTimer = null;
            }
        }, 500);

   } catch (error) {
    connectionStatus.textContent = "MIDI: Akses ditolak/gagal";
    logMidi(`Gagal membuka MIDI: ${error.name} - ${error.message}`);
    console.error("ReyMIDI KeyLab - Gagal membuka MIDI:", error);
}
}


const unloadDebug = sessionStorage.getItem(
    "reyKeyLabUnloadDebug"
);

if (unloadDebug) {
    logMidi("DEBUG: " + unloadDebug);
    sessionStorage.removeItem("reyKeyLabUnloadDebug");
}

createPiano();
connectMIDI();
logMidi("ReyMIDI KeyLab siap.");