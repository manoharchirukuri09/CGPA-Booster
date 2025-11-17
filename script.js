const CONFIG = {
    TOTAL_SEMESTERS: 8,

    // New Required Formula
    // Percentage = CPGA × 9.5
    // CGPA = Percentage ÷ 9.5
    PERCENT_MULTIPLIER: 9.5,

    QUOTES: [
        "Your future is created by what you do today, not tomorrow.",
        "Success is not final, failure is not fatal.",
        "Believe you can and you're halfway there.",
        "The best way to predict the future is to create it.",
        "Small steps every day lead to big results.",
        "Dream big. Work hard. Stay focused.",
        "It does not matter how slowly you go as long as you do not stop.",
        "Make today count. Your future self is watching.",
    ],
};

const STATE = {
    currentTab: "panel-1",
};

// -----------------------------
// CPGA → Percentage  (CPGA × 9.5)
// -----------------------------
function cpgaToPercent(cgpa) {
    cgpa = parseFloat(cgpa);
    let percent = cgpa * CONFIG.PERCENT_MULTIPLIER;

    percent = Math.min(100, Math.max(0, percent));  // clamp
    return percent.toFixed(2);
}

// -----------------------------------------
// Percentage → CGPA (Percentage ÷ 9.5)
// -----------------------------------------
function percentToCgpa(percent) {
    percent = parseFloat(percent);
    let cgpa = percent / CONFIG.PERCENT_MULTIPLIER;

    cgpa = Math.min(10, Math.max(0, cgpa));  // clamp
    return cgpa.toFixed(2);
}

// -------------------------------------------------
// Projected Final CGPA (Boost Formula - VERIFIED)
// -------------------------------------------------
function projectedCGPA(current, completed, planned, futureAvg, target) {
    current = parseFloat(current);
    completed = parseInt(completed);
    planned = parseInt(planned);
    futureAvg = parseFloat(futureAvg);
    target = parseFloat(target);

    const totalSemesters = completed + planned;

    const pointsSoFar = current * completed;
    const futurePoints = futureAvg * planned;

    const projected = (pointsSoFar + futurePoints) / totalSemesters;

    const requiredTotalPoints = target * totalSemesters;
    const requiredFuturePoints = requiredTotalPoints - pointsSoFar;

    let minRequired = requiredFuturePoints / planned;
    minRequired = Math.min(10, Math.max(0, minRequired));

    return {
        projectedCgpa: parseFloat(projected.toFixed(2)),
        minRequired: parseFloat(minRequired.toFixed(2)),
        meta: {
            totalSemesters,
            pointsSoFar: pointsSoFar.toFixed(2),
            futurePoints: futurePoints.toFixed(2),
            requiredTotalPoints: requiredTotalPoints.toFixed(2),
            requiredFuturePoints: requiredFuturePoints.toFixed(2)
        }
    };
}



document.addEventListener("DOMContentLoaded", () => {
    loadState();
    attachEvents();
    switchTab(STATE.currentTab);
    updateRemainingSemestersInfo();
    updateIndividualInputs();
    displayRandomQuote();
});
function attachEvents() {
    document.querySelectorAll(".tab").forEach(tab => {
        tab.addEventListener("click", () => switchTab(tab.getAttribute("aria-controls")));
    });

    document.getElementById("boostCgpaForm").addEventListener("submit", handleBoostSubmit);
    document.getElementById("reloadResetBtn").addEventListener("click", resetApp);

    document.getElementById("completedSemesters").addEventListener("input", updateRemainingSemestersInfo);
    document.getElementById("plannedSemesters").addEventListener("input", updateRemainingSemestersInfo);

    document.querySelectorAll("input[name='inputMethod']")
        .forEach(option => option.addEventListener("change", updateIndividualInputs));

    document.getElementById("cpgaToPercentInput")
        .addEventListener("input", calculateCgpaToPercent);

    document.getElementById("percentToCgpaInput")
        .addEventListener("input", calculatePercentToCgpa);

    document.addEventListener("keydown", e => {
        if (e.key === "r" || e.key === "R") resetApp();
    });
}
function switchTab(id) {
    STATE.currentTab = id;

    document.querySelectorAll(".tab").forEach(tab => {
        tab.setAttribute("aria-selected", tab.getAttribute("aria-controls") === id);
    });

    document.querySelectorAll(".tabpanel").forEach(panel => {
        panel.style.display = (panel.id === id ? "block" : "none");
    });

    if (id === "panel-2") calculateCgpaToPercent();
    if (id === "panel-3") calculatePercentToCgpa();
}
function saveState() {
    ["currentCgpa", "completedSemesters", "plannedSemesters", "targetCgpa"]
        .forEach(id => localStorage.setItem(id, document.getElementById(id).value));
}

function loadState() {
    ["currentCgpa", "completedSemesters", "plannedSemesters", "targetCgpa"]
        .forEach(id => {
            const val = localStorage.getItem(id);
            if (val !== null) document.getElementById(id).value = val;
        });
}
function handleBoostSubmit(e) {
    e.preventDefault();

    const current = document.getElementById("currentCgpa").value;
    const completed = document.getElementById("completedSemesters").value;
    const planned = document.getElementById("plannedSemesters").value;
    const target = document.getElementById("targetCgpa").value;

    let futureAvg;

    const method = document.querySelector("input[name='inputMethod']:checked").value;

    if (method === "average") {
        futureAvg = document.getElementById("expectedAverageCgpa").value;
    } else {
        const inputs = [...document.querySelectorAll("#individualInputs input")];
        const sum = inputs.reduce((s, i) => s + parseFloat(i.value || 0), 0);
        futureAvg = (inputs.length ? sum / inputs.length : 0);
    }

    const result = projectedCGPA(current, completed, planned, futureAvg, target);

    saveState();
    displayBoostResults(result, target);
    displayRandomQuote();
}
function displayBoostResults(result, targetCgpa) {
    const box = document.getElementById("boostResults");
    box.style.display = "block";

    document.getElementById("projectedCgpaValue").textContent =
        result.projectedCgpa.toFixed(2);

    const bar = document.querySelector(".progress-bar");
    const percent = (result.projectedCgpa / 10) * 100;

    bar.style.width = "0%";
    requestAnimationFrame(() => {
        bar.style.width = percent + "%";
        bar.textContent = result.projectedCgpa.toFixed(2);
        bar.style.backgroundColor =
            (result.projectedCgpa >= targetCgpa ? "var(--success-color)" : "var(--warning-color)");
    });

    const msg = document.getElementById("targetStatusMessage");
    msg.className =
        (result.projectedCgpa >= targetCgpa ? "status-message status-achieved" : "status-message status-not-achieved");
    msg.textContent =
        (result.projectedCgpa >= targetCgpa ? "Target Achieved!" : "Target Not Achieved.");

    document.getElementById("minAverageRequired").innerHTML =
        `Minimum required CPGA for remaining semesters: <strong>${result.minRequired}</strong>`;

    document.getElementById("mathDetails").innerHTML = `
        <p><strong>Total Semesters:</strong> ${result.meta.totalSemesters}</p>
        <p><strong>Points So Far:</strong> ${result.meta.pointsSoFar}</p>
        <p><strong>Expected Future Points:</strong> ${result.meta.futurePoints}</p>
    `;
}
function updateRemainingSemestersInfo() {
    const completed = parseInt(document.getElementById("completedSemesters").value) || 0;
    const plannedInput = document.getElementById("plannedSemesters");
    let planned = parseInt(plannedInput.value) || 0;

    const max = CONFIG.TOTAL_SEMESTERS - completed;

    plannedInput.max = max;
    if (planned > max) plannedInput.value = max;

    document.getElementById("remainingSemestersInfo").textContent =
        `Total Semesters: ${CONFIG.TOTAL_SEMESTERS} | Remaining: ${max}`;

    updateIndividualInputs();
}

function updateIndividualInputs() {
    const method = document.querySelector("input[name='inputMethod']:checked").value;
    const avgBox = document.getElementById("averageInput");
    const listBox = document.getElementById("individualInputs");
    const count = parseInt(document.getElementById("plannedSemesters").value) || 0;

    if (method === "average") {
        avgBox.style.display = "block";
        listBox.style.display = "none";
        return;
    }

    avgBox.style.display = "none";
    listBox.style.display = "block";
    listBox.innerHTML = "";

    for (let i = 1; i <= count; i++) {
        listBox.innerHTML += `
            <div class="form-group">
                <label>Expected CPGA for Semester ${i}</label>
                <input type="number" min="0" max="10" step="0.01" value="8.0">
            </div>`;
    }
}
function calculateCgpaToPercent() {
    const input = document.getElementById("cpgaToPercentInput").value;
    const out = document.getElementById("percentOutput");
    const hint = document.getElementById("cpgaToPercentMicrocopy");

    if (!input) {
        out.value = "";
        hint.textContent = "Enter CPGA.";
        return;
    }

    out.value = cpgaToPercent(input);
    hint.textContent = "Formula used: CPGA × 9.5";
}

function calculatePercentToCgpa() {
    const input = document.getElementById("percentToCgpaInput").value;
    const out = document.getElementById("cpgaOutput");
    const hint = document.getElementById("percentToCgpaMicrocopy");

    if (!input) {
        out.value = "";
        hint.textContent = "Enter percentage.";
        return;
    }

    out.value = percentToCgpa(input);
    hint.textContent = "Formula used: Percentage ÷ 9.5";
}
function displayRandomQuote() {
    const quotes = CONFIG.QUOTES;
    document.getElementById("motivationalQuote").textContent =
        quotes[Math.floor(Math.random() * quotes.length)];
}

function resetApp() {
    const btn = document.getElementById("reloadResetBtn");
    btn.classList.add("reloading");

    document.getElementById("boostCgpaForm").reset();
    document.getElementById("boostResults").style.display = "none";
    document.getElementById("cpgaToPercentInput").value = "";
    document.getElementById("percentToCgpaInput").value = "";
    document.getElementById("percentOutput").value = "";
    document.getElementById("cpgaOutput").value = "";

    localStorage.clear();

    setTimeout(() => {
        btn.classList.remove("reloading");
        updateRemainingSemestersInfo();
        updateIndividualInputs();
        displayRandomQuote();
    }, 600);
}
