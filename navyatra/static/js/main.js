/* ==========================================================================
   NAVYATRA FRONT-END CONTROLLER & PNG EXPORTER ENGINE
   ========================================================================== */

document.addEventListener("DOMContentLoaded", function () {
    // 1. ENTRY PAGE TAB SWITCHER
    const tabLogin = document.getElementById("tab-login");
    const tabRegister = document.getElementById("tab-register");
    const formLogin = document.getElementById("form-login");
    const formRegister = document.getElementById("form-register");
    const actionInput = document.getElementById("action-input");

    if (tabLogin && tabRegister && formLogin && formRegister) {
        tabLogin.addEventListener("click", function () {
            tabLogin.classList.add("active");
            tabRegister.classList.remove("active");
            formLogin.style.display = "block";
            formRegister.style.display = "none";
            if (actionInput) actionInput.value = "login";
        });

        tabRegister.addEventListener("click", function () {
            tabRegister.classList.add("active");
            tabLogin.classList.remove("active");
            formRegister.style.display = "block";
            formLogin.style.display = "none";
            if (actionInput) actionInput.value = "register";
        });
    }

    // Global variable to store active itinerary for PNG export
    let currentItineraryData = null;

    // 2. STEP 1: EXPLORE AREA ENDPOINT HANDLER
    const btnExplore = document.getElementById("btn-explore");
    const spotsResults = document.getElementById("spots-results");

    if (btnExplore && spotsResults) {
        btnExplore.addEventListener("click", function () {
            const location = document.getElementById("input-location").value.trim();
            const subLocation = document.getElementById("input-sub-location").value.trim();

            if (!location || !subLocation) {
                showError(spotsResults, "Please enter both the location and the specific sub-location (e.g. Bangalore & BTM Layout).");
                return;
            }

            // Show coffee loader
            spotsResults.innerHTML = `
                <div class="loader"></div>
                <p class="loading-text">Our Local AI Model is retrieving secret spots in ${subLocation}...</p>
            `;
            spotsResults.style.display = "block";

            // Fetch request
            fetch(`/api/explore/?location=${encodeURIComponent(location)}&sub_location=${encodeURIComponent(subLocation)}`)
                .then(response => {
                    if (!response.ok) throw new Error("Could not fetch spots.");
                    return response.json();
                })
                .then(data => {
                    if (data.error) {
                        showError(spotsResults, data.error);
                    } else if (data.spots && data.spots.length > 0) {
                        renderSpots(data.spots);
                    } else {
                        showError(spotsResults, "No spots found for this location.");
                    }
                })
                .catch(err => {
                    showError(spotsResults, "An error occurred while exploring spots. Please check your Ollama connection or try again.");
                });
        });
    }

    // 3. STEP 2: GENERATE BUDGET VISUAL MAP
    const btnGenerate = document.getElementById("btn-generate");
    const itineraryResults = document.getElementById("itinerary-results");

    if (btnGenerate && itineraryResults) {
        btnGenerate.addEventListener("click", function () {
            const location = document.getElementById("input-location").value.trim();
            const subLocation = document.getElementById("input-sub-location").value.trim();
            const budgetVal = document.getElementById("input-budget").value.trim();
            const daysVal = document.getElementById("input-days").value.trim();

            if (!location || !subLocation || !budgetVal || !daysVal) {
                showError(itineraryResults, "Please complete Step 1 and fill in both budget and days for Step 2.");
                return;
            }

            const budget = parseInt(budgetVal);
            const days = parseInt(daysVal);

            // VALIDATIONS
            if (isNaN(budget) || budget < 10000) {
                showError(itineraryResults, "Exquisite NavYatra travel planning requires a minimum budget of 10,000 INR. Budgets below 10,000 INR are not accepted.");
                return;
            }

            if (isNaN(days) || days < 2) {
                showError(itineraryResults, "Journey plans must span a minimum of 2 days. Shorter plans are not accepted.");
                return;
            }

            // Show coffee loader
            itineraryResults.innerHTML = `
                <div class="loader"></div>
                <p class="loading-text">Local AI Qwen is mapping a cost-effective visual itinerary under INR ${budget.toLocaleString('en-IN')}...</p>
            `;
            itineraryResults.style.display = "block";

            // Scroll to loader
            itineraryResults.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            // Fetch request
            fetch(`/api/itinerary/?location=${encodeURIComponent(location)}&sub_location=${encodeURIComponent(subLocation)}&budget=${budget}&days=${days}`)
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(json => { throw new Error(json.error || "Itinerary fetch failed."); });
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.error) {
                        showError(itineraryResults, data.error);
                    } else {
                        currentItineraryData = data; // Cache globally for PNG download
                        renderItinerary(data);
                    }
                })
                .catch(err => {
                    showError(itineraryResults, err.message || "An error occurred while generating the itinerary. Ensure Ollama is running local model 'qwen2.5:latest'.");
                });
        });
    }

    // Helper functions
    function showError(container, message) {
        container.innerHTML = `
            <div class="alert-banner alert-error" style="margin-top: 15px;">
                <strong>NavYatra System Notice:</strong> ${message}
            </div>
        `;
        container.style.display = "block";
    }

    function renderSpots(spots) {
        let html = `
            <div class="spots-section">
                <h3 style="font-size: 22px; margin-bottom: 5px;">📍 Best in the Area</h3>
                <p style="color: var(--color-cappuccino); margin-bottom: 20px; font-size: 14px;">Local spots with estimated real values and categories</p>
                <div class="spots-grid">
        `;

        spots.forEach(spot => {
            html += `
                <div class="spot-card">
                    <div class="spot-meta">
                        <span class="spot-category">${spot.category}</span>
                        <span class="spot-cost">${spot.estimated_cost}</span>
                    </div>
                    <h4 class="spot-name">${spot.name}</h4>
                    <p class="spot-desc">${spot.description}</p>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
        spotsResults.innerHTML = html;
    }

    function renderItinerary(data) {
        let html = `
            <div class="itinerary-section">
                <div class="itinerary-dashboard-card">
                    <div class="itinerary-summary-bar">
                        <div class="summary-stat">
                            <div class="stat-label">Total Budget Allocated</div>
                            <div class="stat-val">INR ${data.budget.toLocaleString('en-IN')}</div>
                        </div>
                        <div class="summary-stat" style="border-left: 1px solid var(--color-latte); border-right: 1px solid var(--color-latte);">
                            <div class="stat-label">Estimated Real Expense</div>
                            <div class="stat-val" style="color: var(--color-espresso);">INR ${data.total_estimated_expense.toLocaleString('en-IN')}</div>
                        </div>
                        <div class="summary-stat">
                            <div class="stat-label">Budget Savings</div>
                            <div class="stat-val" style="color: #276A27;">INR ${data.savings.toLocaleString('en-IN')}</div>
                        </div>
                    </div>
                </div>
                
                <h3 style="font-size: 24px; margin-bottom: 20px; text-align: center;">🗺️ Visual Journey Map</h3>
                <div class="visual-map-grid" id="visual-map-export-target">
        `;

        data.itinerary_days.forEach(day => {
            html += `
                <div class="day-box">
                    <div class="day-header">
                        <span class="day-title">Day ${day.day}</span>
                        <span class="day-theme">${day.theme}</span>
                    </div>
                    <div class="day-content">
                        <div class="timeline">
            `;

            day.activities.forEach(act => {
                let catIcon = "📍";
                if (act.category.toLowerCase() === "food") catIcon = "☕";
                else if (act.category.toLowerCase() === "devotion") catIcon = "🕉️";
                else if (act.category.toLowerCase() === "scenery") catIcon = "🌳";
                else if (act.category.toLowerCase() === "stay" || act.category.toLowerCase() === "hotel") catIcon = "🏨";

                html += `
                    <div class="timeline-item">
                        <div class="timeline-marker"></div>
                        <div class="activity-card">
                            <div class="act-time-row">
                                <span class="act-time">${act.time}</span>
                                <span class="act-cost-badge">${catIcon} Cost: INR ${act.cost}</span>
                            </div>
                            <h4 class="act-title">${act.title}</h4>
                            <p class="act-desc">${act.description}</p>
                        </div>
                    </div>
                `;
            });

            // Stay Info
            if (day.stay) {
                html += `
                        </div>
                        <div class="stay-box">
                            <div class="stay-title">🏨 Nightly Lodging: <span>${day.stay.name}</span></div>
                            <div class="stay-cost">INR ${day.stay.cost} / night</div>
                        </div>
                    </div>
                </div>
                `;
            } else {
                html += `
                        </div>
                    </div>
                </div>
                `;
            }
        });

        // Add Export actions
        html += `
                </div>
                <div class="itinerary-actions">
                    <button class="btn-download" id="btn-export-png">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Download Journey Map (PNG)
                    </button>
                </div>
            </div>
        `;

        itineraryResults.innerHTML = html;
        itineraryResults.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Bind PNG Download Action
        const btnExport = document.getElementById("btn-export-png");
        if (btnExport) {
            btnExport.addEventListener("click", downloadItineraryAsPNG);
        }
    }

    // ==========================================================================
    // PREMIUM CANVAS-BASED INFOGRAPHIC PNG EXPORTER
    // ==========================================================================
    function downloadItineraryAsPNG() {
        if (!currentItineraryData) return;

        const data = currentItineraryData;
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Constants
        const width = 900;
        const xPad = 50;
        
        // Dynamic height calculation
        let currentY = 0;
        
        // Height allocation sizes
        const headerHeight = 220;
        const statsHeight = 130;
        const dayHeaderHeight = 65;
        const activityHeight = 100;
        const stayHeight = 55;
        const dayGap = 40;
        const footerHeight = 100;
        
        let totalHeight = headerHeight + statsHeight + 30; // initial header & stats space
        
        data.itinerary_days.forEach(day => {
            totalHeight += dayHeaderHeight;
            totalHeight += day.activities.length * activityHeight;
            if (day.stay) totalHeight += stayHeight;
            totalHeight += dayGap;
        });
        
        totalHeight += footerHeight;
        
        canvas.width = width;
        canvas.height = totalHeight;

        // Draw Premium Background (Crema White)
        ctx.fillStyle = "#FCFBF7";
        ctx.fillRect(0, 0, width, totalHeight);

        // Draw Soft Latte Outer Border
        ctx.strokeStyle = "#DCD3BF";
        ctx.lineWidth = 14;
        ctx.strokeRect(7, 7, width - 14, totalHeight - 14);

        currentY = 40;

        // --- DRAW HEADER SECTION ---
        // 1. Draw SVG Logo Symbol: Circle + Italic NY
        const logoX = width / 2;
        const logoY = currentY + 45;
        
        // Draw Logo Circular Outline
        ctx.strokeStyle = "#3E2723";
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(logoX, logoY, 32, 0, Math.PI * 2);
        ctx.stroke();

        // Draw Logo Text "NY"
        ctx.font = "italic 900 28px 'Playfair Display', Georgia, serif";
        ctx.fillStyle = "#3E2723";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("NY", logoX, logoY);

        currentY += 105;

        // Brand Name
        ctx.font = "700 24px 'Playfair Display', Georgia, serif";
        ctx.fillText("N a v Y a t r a", width / 2, currentY);
        
        currentY += 30;

        // Title
        ctx.font = "italic 300 16px 'Outfit', sans-serif";
        ctx.fillStyle = "#9C8469";
        ctx.fillText("EXCLUSIVE JOURNEY GUIDER & BUDGET ANALYSIS", width / 2, currentY);

        currentY += 35;

        // Destination Info
        ctx.font = "700 22px 'Playfair Display', Georgia, serif";
        ctx.fillStyle = "#2F1F17";
        ctx.fillText(`Trip to: ${data.sub_location}, ${data.location}`, width / 2, currentY);

        currentY += 45;

        // --- DRAW SUMMARY STATS BOXES ---
        // Background for Stats Container (Foam Milk)
        ctx.fillStyle = "#F4F0E6";
        ctx.fillRect(xPad, currentY, width - (xPad * 2), 95);
        ctx.strokeStyle = "#DCD3BF";
        ctx.lineWidth = 1;
        ctx.strokeRect(xPad, currentY, width - (xPad * 2), 95);

        const colW = (width - (xPad * 2)) / 3;
        
        // Stat 1: Budget
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = "#9C8469";
        ctx.font = "600 12px 'Outfit', sans-serif";
        ctx.fillText("TOTAL BUDGET", xPad + (colW / 2), currentY + 35);
        ctx.fillStyle = "#3E2723";
        ctx.font = "900 22px 'Playfair Display', Georgia, serif";
        ctx.fillText(`INR ${data.budget.toLocaleString('en-IN')}`, xPad + (colW / 2), currentY + 68);

        // Divider 1
        ctx.strokeStyle = "#DCD3BF";
        ctx.beginPath();
        ctx.moveTo(xPad + colW, currentY + 15);
        ctx.lineTo(xPad + colW, currentY + 80);
        ctx.stroke();

        // Stat 2: Total Expense
        ctx.fillStyle = "#9C8469";
        ctx.font = "600 12px 'Outfit', sans-serif";
        ctx.fillText("ESTIMATED EXPENSE", xPad + colW + (colW / 2), currentY + 35);
        ctx.fillStyle = "#3E2723";
        ctx.font = "900 22px 'Playfair Display', Georgia, serif";
        ctx.fillText(`INR ${data.total_estimated_expense.toLocaleString('en-IN')}`, xPad + colW + (colW / 2), currentY + 68);

        // Divider 2
        ctx.beginPath();
        ctx.moveTo(xPad + (colW * 2), currentY + 15);
        ctx.lineTo(xPad + (colW * 2), currentY + 80);
        ctx.stroke();

        // Stat 3: Savings
        ctx.fillStyle = "#9C8469";
        ctx.font = "600 12px 'Outfit', sans-serif";
        ctx.fillText("ACCUMULATED SAVINGS", xPad + (colW * 2) + (colW / 2), currentY + 35);
        ctx.fillStyle = "#276A27";
        ctx.font = "900 22px 'Playfair Display', Georgia, serif";
        ctx.fillText(`INR ${data.savings.toLocaleString('en-IN')}`, xPad + (colW * 2) + (colW / 2), currentY + 68);

        currentY += 140;

        // --- DRAW DAYS AND TIMELINES ---
        data.itinerary_days.forEach(day => {
            // Draw Day Header Band (Espresso Coffee)
            ctx.fillStyle = "#3E2723";
            ctx.fillRect(xPad, currentY, width - (xPad * 2), 48);

            ctx.textAlign = "left";
            ctx.fillStyle = "#FCFBF7";
            ctx.font = "900 18px 'Playfair Display', Georgia, serif";
            ctx.fillText(`Day ${day.day}`, xPad + 20, currentY + 30);

            ctx.textAlign = "right";
            ctx.font = "italic 300 14px 'Outfit', sans-serif";
            ctx.fillText(day.theme, width - xPad - 20, currentY + 29);

            currentY += 48;

            // Day Container Inner background
            const dayBoxStart = currentY;
            
            // Draw Activities
            day.activities.forEach((act, idx) => {
                currentY += 25;
                
                // Draw Timeline Bullet points & vertical line
                ctx.strokeStyle = "#DCD3BF";
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(xPad + 40, currentY + 5);
                ctx.lineTo(xPad + 40, currentY + 65);
                ctx.stroke();

                ctx.fillStyle = "#FCFBF7";
                ctx.strokeStyle = "#9C8469";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(xPad + 40, currentY + 5, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Draw Text details
                ctx.textAlign = "left";
                
                // Time
                ctx.fillStyle = "#3E2723";
                ctx.font = "700 13px 'Outfit', sans-serif";
                ctx.fillText(act.time, xPad + 70, currentY + 10);

                // Category Badge / Icon Text
                let catIcon = "📍";
                if (act.category.toLowerCase() === "food") catIcon = "☕";
                else if (act.category.toLowerCase() === "devotion") catIcon = "🕉️";
                else if (act.category.toLowerCase() === "scenery") catIcon = "🌳";
                else if (act.category.toLowerCase() === "stay" || act.category.toLowerCase() === "hotel") catIcon = "🏨";
                
                // Cost Right-aligned
                ctx.textAlign = "right";
                ctx.fillStyle = "#2F1F17";
                ctx.font = "700 13px 'Outfit', sans-serif";
                ctx.fillText(`${catIcon} INR ${act.cost}`, width - xPad - 30, currentY + 10);

                // Title
                ctx.textAlign = "left";
                ctx.fillStyle = "#2F1F17";
                ctx.font = "700 15px 'Outfit', sans-serif";
                ctx.fillText(act.title, xPad + 160, currentY + 10);

                // Description
                ctx.fillStyle = "#2F1F17";
                ctx.font = "300 13px 'Outfit', sans-serif";
                ctx.fillText(act.description, xPad + 70, currentY + 32);

                currentY += 45;
            });

            // Draw Stay Info Banner (Creamy Foam Milk)
            if (day.stay) {
                currentY += 20;
                ctx.fillStyle = "#F4F0E6";
                ctx.fillRect(xPad, currentY, width - (xPad * 2), 40);
                
                ctx.textAlign = "left";
                ctx.fillStyle = "#2F1F17";
                ctx.font = "700 13px 'Outfit', sans-serif";
                ctx.fillText(`🏨 Lodging: ${day.stay.name}`, xPad + 20, currentY + 25);

                ctx.textAlign = "right";
                ctx.fillStyle = "#3E2723";
                ctx.font = "700 13px 'Outfit', sans-serif";
                ctx.fillText(`INR ${day.stay.cost} / night`, width - xPad - 20, currentY + 25);
                
                currentY += 40;
            }

            // Outline around the day box
            ctx.strokeStyle = "#DCD3BF";
            ctx.lineWidth = 1;
            ctx.strokeRect(xPad, dayBoxStart, width - (xPad * 2), currentY - dayBoxStart);

            currentY += dayGap;
        } );

        // --- DRAW FOOTER SECTION ---
        ctx.strokeStyle = "rgba(62, 39, 35, 0.1)";
        ctx.beginPath();
        ctx.moveTo(xPad, currentY);
        ctx.lineTo(width - xPad, currentY);
        ctx.stroke();

        currentY += 35;

        ctx.textAlign = "center";
        ctx.fillStyle = "#9C8469";
        ctx.font = "700 12px 'Outfit', sans-serif";
        ctx.fillText("NAVYATRA PLANNER | POWERED BY QWEN 2.5 LOCAL AI MODEL", width / 2, currentY);

        currentY += 20;
        ctx.font = "300 11px 'Outfit', sans-serif";
        ctx.fillText("BTM Layout, Bangalore, 4/11 | ph: 98843762648 | ramireddy@ny.com", width / 2, currentY);

        // Create virtual download anchor
        try {
            const dataURL = canvas.toDataURL("image/png");
            const dlAnchor = document.createElement("a");
            dlAnchor.download = `navyatra_${data.sub_location.toLowerCase()}_itinerary.png`;
            dlAnchor.href = dataURL;
            document.body.appendChild(dlAnchor);
            dlAnchor.click();
            document.body.removeChild(dlAnchor);
        } catch (e) {
            console.error("Canvas export failed:", e);
            alert("Could not complete image download due to security limits or layout constraints. Please take a screenshot.");
        }
    }
});
