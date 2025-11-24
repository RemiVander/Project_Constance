
async function loadDevisParStatut() {
    const canvas = document.getElementById("devisStatutChart");
    if (!canvas) return;
    try {
        const res = await fetch("/admin/api/devis_par_statut");
        if (!res.ok) return;
        const json = await res.json();
        const ctx = canvas.getContext("2d");
        new Chart(ctx, {
            type: "bar",
            data: {
                labels: json.labels,
                datasets: [{
                    label: "Devis",
                    data: json.data
                }]
            },
            options: {
                responsive: true
            }
        });
    } catch (e) {
        console.error(e);
    }
}

async function loadCaParBoutique() {
    const canvas = document.getElementById("caBoutiqueChart");
    if (!canvas) return;
    try {
        const res = await fetch("/admin/api/ca_par_boutique");
        if (!res.ok) return;
        const json = await res.json();
        const ctx = canvas.getContext("2d");
        new Chart(ctx, {
            type: "bar",
            data: {
                labels: json.labels,
                datasets: [{
                    label: "CA (€)",
                    data: json.data
                }]
            },
            options: {
                responsive: true
            }
        });
    } catch (e) {
        console.error(e);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadDevisParStatut();
    loadCaParBoutique();
});
