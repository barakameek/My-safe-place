document.addEventListener('DOMContentLoaded', function() {
    // --- STATE MANAGEMENT ---
    let state = {
        currentUser: null,
        profiles: [],
        preferences: {
             'initiation': [
                { id: 'init_other', text: '💖 I like others to make the first move' },
                { id: 'init_ask', text: '🗣️ I prefer to be asked before anything starts' },
                { id: 'init_self', text: '🌟 I like to initiate things myself' },
            ],
            'verbal': [
                { id: 'verb_min', text: '🤫 I prefer minimal talking during play' },
                { id: 'verb_some', text: '💬 I like some verbal communication' },
                { id: 'verb_non', text: '👋 I prefer non-verbal cues and signals' }
            ],
            'boundaries': [
                { id: 'bound_verbal', text: '🗣️ I communicate boundaries verbally upfront' },
                { id: 'bound_written', text: '📝 I prefer written boundary discussions' },
                { id: 'bound_signals', text: '🚨 I use safe words/signals during play' }
            ],
            'comfort': [
                { id: 'comfort_cuddle', text: '🛋️ I enjoy cuddle/chat time afterwards' },
                { id: 'comfort_leave', text: '🏃‍♀️ I like to leave soon after we finish' },
                { id: 'comfort_breaks', text: '☕ I need breaks during longer activities' }
            ]
        }
    };

    function saveState() {
        localStorage.setItem('appState', JSON.stringify(state));
    }

    function loadState() {
        const savedState = localStorage.getItem('appState');
        if (savedState) {
            state = JSON.parse(savedState);
        } else {
            loadSampleData();
        }
    }

    // --- INITIALIZATION ---
    function init() {
        loadState();
        setupEventListeners();
        setupPreferenceCheckboxes();
        generateCalendar();
        if (state.currentUser) {
            populateProfileForm();
            updateUIAfterLogin();
        }
        displayProfiles();
        updateMatches();
    }

    function setupEventListeners() {
        document.querySelector('.nav').addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-btn')) {
                showSection(e.target.dataset.section);
            }
        });
        document.getElementById('profileForm').addEventListener('submit', handleProfileSave);
        document.getElementById('printCardBtn').addEventListener('click', generatePrintCard);
        document.getElementById('saveAvailabilityBtn').addEventListener('click', saveAvailability);

        document.getElementById('filterName').addEventListener('input', displayProfiles);
        document.getElementById('filterExperience').addEventListener('change', displayProfiles);
    }

    // --- UI & SECTIONS ---
    function showSection(sectionName) {
        document.querySelectorAll('.section.active').forEach(s => s.classList.remove('active'));
        document.getElementById(sectionName).classList.add('active');
        document.querySelectorAll('.nav-btn.active').forEach(b => b.classList.remove('active'));
        document.querySelector(`.nav-btn[data-section="${sectionName}"]`).classList.add('active');
    }

    function updateUIAfterLogin() {
        // Refresh displays that depend on currentUser
        displayProfiles();
        updateMatches();
        updateCalendarAvailability();
    }

    // --- PROFILE MANAGEMENT ---
    function handleProfileSave(e) {
        e.preventDefault();
        const selectedPreferences = {};
        Object.keys(state.preferences).forEach(category => {
            selectedPreferences[category] = Array.from(document.querySelectorAll(`#preferencesContainer input[data-category="${category}"]:checked`))
                .map(input => input.id);
        });

        const isNewUser = !state.currentUser;
        state.currentUser = {
            id: state.currentUser ? state.currentUser.id : 'user_' + Date.now(),
            name: document.getElementById('name').value,
            age: document.getElementById('age').value,
            bio: document.getElementById('bio').value,
            preferences: selectedPreferences,
            experience: document.getElementById('experience').value,
            stimulation: document.getElementById('stimulation').value,
            scripts: document.getElementById('scripts').value,
            interestedIn: state.currentUser ? state.currentUser.interestedIn : {},
            availability: state.currentUser ? state.currentUser.availability : {},
            blocked: state.currentUser ? state.currentUser.blocked : []
        };

        if (isNewUser) {
            // Add the new user to the list of profiles so others can see them
            state.profiles.push(state.currentUser);
        } else {
            // Update the profile in the main list
            const profileIndex = state.profiles.findIndex(p => p.id === state.currentUser.id);
            if (profileIndex > -1) {
                state.profiles[profileIndex] = state.currentUser;
            }
        }

        saveState();
        alert('Profile saved successfully!');
        updateUIAfterLogin();
    }
    
    function populateProfileForm() {
        if (!state.currentUser) return;
        document.getElementById('name').value = state.currentUser.name;
        document.getElementById('age').value = state.currentUser.age;
        document.getElementById('bio').value = state.currentUser.bio;
        document.getElementById('experience').value = state.currentUser.experience;
        document.getElementById('stimulation').value = state.currentUser.stimulation;
        document.getElementById('scripts').value = state.currentUser.scripts;

        // Populate checkboxes
        Object.keys(state.currentUser.preferences).forEach(category => {
            state.currentUser.preferences[category].forEach(prefId => {
                const checkbox = document.getElementById(prefId);
                if (checkbox) checkbox.checked = true;
            });
        });
    }

    // --- PREFERENCES & BROWSE ---
    function getPreferenceTextById(id) {
        for (const category in state.preferences) {
            const pref = state.preferences[category].find(p => p.id === id);
            if (pref) return pref.text;
        }
        return '';
    }
    
    function setupPreferenceCheckboxes() {
        const container = document.getElementById('preferencesContainer');
        container.innerHTML = '';
        Object.keys(state.preferences).forEach(category => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'preference-category';
            const categoryTitle = document.createElement('h4');
            categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1);
            categoryDiv.appendChild(categoryTitle);
            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'checkbox-group';
            state.preferences[category].forEach(option => {
                const item = document.createElement('div');
                item.className = 'checkbox-item';
                item.innerHTML = `
                    <input type="checkbox" id="${option.id}" value="${option.text}" data-category="${category}">
                    <label for="${option.id}">${option.text}</label>
                `;
                optionsDiv.appendChild(item);
            });
            categoryDiv.appendChild(optionsDiv);
            container.appendChild(categoryDiv);
        });
    }

    function displayProfiles() {
        const container = document.getElementById('profilesList');
        container.innerHTML = '';
        if (!state.currentUser) {
            container.innerHTML = '<p>Please create your profile first to browse others.</p>';
            return;
        }

        const filterName = document.getElementById('filterName').value.toLowerCase();
        const filterExperience = document.getElementById('filterExperience').value;

        const visibleProfiles = state.profiles.filter(profile => {
            const isSelf = profile.id === state.currentUser.id;
            const isBlocked = state.currentUser.blocked.includes(profile.id);
            const nameMatch = profile.name.toLowerCase().includes(filterName);
            const expMatch = !filterExperience || profile.experience === filterExperience;
            return !isSelf && !isBlocked && nameMatch && expMatch;
        });

        if (visibleProfiles.length === 0) {
            container.innerHTML = '<p>No profiles match your criteria.</p>';
            return;
        }

        visibleProfiles.forEach(profile => {
            const card = document.createElement('div');
            card.className = 'profile-card';
            const compatibilityNotes = calculateCompatibility(state.currentUser, profile);
            card.innerHTML = `
                <div class="profile-header">
                    <div class="profile-name">${profile.name}, ${profile.age}</div>
                </div>
                <p style="margin-bottom: 15px; color: #666;">${profile.bio}</p>
                ${compatibilityNotes.length > 0 ? `
                    <div class="compatibility-notes">
                        <strong>⚡ Compatibility Notes:</strong>
                        <ul>${compatibilityNotes.map(note => `<li>${note}</li>`).join('')}</ul>
                    </div>
                ` : ''}
                <div class="match-actions">
                    <button class="match-btn interested-btn" onclick="app.markInterested('${profile.id}')">Interested</button>
                    <button class="match-btn not-interested-btn" onclick="app.markInterested('${profile.id}', false)">Not Now</button>
                    <button class="match-btn block-btn" onclick="app.blockUser('${profile.id}')">Block</button>
                </div>
            `;
            container.appendChild(card);
        });
    }

    function calculateCompatibility(user1, user2) {
        const notes = [];
        const p1 = user1.preferences;
        const p2 = user2.preferences;

        if (p1.initiation?.includes('init_self') && p2.initiation?.includes('init_other')) {
            notes.push(`You like to initiate, and they like others to make the first move.`);
        }
        if (p2.initiation?.includes('init_self') && p1.initiation?.includes('init_other')) {
            notes.push(`They like to initiate, and you like others to make the first move.`);
        }
        if (p1.comfort?.includes('comfort_cuddle') && p2.comfort?.includes('comfort_cuddle')) {
            notes.push(`You both enjoy aftercare and cuddling.`);
        }
        return notes;
    }
    
    window.app = { // Expose functions to global scope for onclick handlers
        markInterested: (profileId, interested = true) => {
            if (!state.currentUser) return;
            const profile = state.profiles.find(p => p.id === profileId);
            if (profile) {
                if (interested) {
                    state.currentUser.interestedIn[profileId] = true;
                    if (!profile.interestedIn) profile.interestedIn = {};
                    profile.interestedIn[state.currentUser.id] = true; // Simulating the other user's interest for demo
                    alert(`Marked as interested in ${profile.name}!`);
                } else {
                    delete state.currentUser.interestedIn[profileId];
                }
                saveState();
                updateMatches();
            }
        },
        blockUser: (profileId) => {
            if (!state.currentUser) return;
            if (confirm(`Are you sure you want to block this user? You will no longer see them and they will not see you.`)) {
                state.currentUser.blocked.push(profileId);
                // Also remove any interest to clean up
                delete state.currentUser.interestedIn[profileId];
                saveState();
                displayProfiles();
                updateMatches();
                alert('User has been blocked.');
            }
        },
        startConversation: (profileId) => {
             const profile = state.profiles.find(p => p.id === profileId);
             alert(`Great! In a full app, this would open a private chat with ${profile.name}.`);
        }
    };


    // --- MATCHES & CALENDAR ---
    function updateMatches() {
        const container = document.getElementById('mutualMatches');
        container.innerHTML = '';
        if (!state.currentUser) {
            container.innerHTML = '<p>Create your profile to see mutual interests.</p>';
            return;
        }

        const mutualMatches = state.profiles.filter(profile =>
            !state.currentUser.blocked.includes(profile.id) &&
            state.currentUser.interestedIn[profile.id] &&
            profile.interestedIn && profile.interestedIn[state.currentUser.id]
        );

        if (mutualMatches.length === 0) {
            container.innerHTML = '<p>No mutual interests yet. Keep browsing!</p>';
            return;
        }

        mutualMatches.forEach(profile => {
            const card = document.createElement('div');
            card.className = 'profile-card mutual-match';
            card.innerHTML = `
                <div class="profile-header">
                    <div class="profile-name">🎉 ${profile.name} (Mutual Interest!)</div>
                </div>
                <p>${profile.bio}</p>
                <div class="group-calendar-container">
                    <strong>Shared Availability:</strong>
                    <div class="group-calendar" id="group-cal-${profile.id}"></div>
                </div>
                <button class="btn" onclick="app.startConversation('${profile.id}')" style="margin-top: 15px;">
                    Start Planning
                </button>
            `;
            container.appendChild(card);
            displayGroupAvailability(profile, `group-cal-${profile.id}`);
        });
    }

    function generateCalendar() {
        const calendar = document.getElementById('availabilityCalendar');
        calendar.innerHTML = '';
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        daysOfWeek.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.textContent = day;
            dayHeader.style.fontWeight = 'bold';
            dayHeader.style.textAlign = 'center';
            calendar.appendChild(dayHeader);
        });

        const today = new Date();
        for (let i = 0; i < 28; i++) {
            const date = new Date();
            date.setDate(today.getDate() + i);
            const dateString = date.toISOString().split('T')[0];
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = date.getDate();
            dayElement.dataset.date = dateString;
            dayElement.addEventListener('click', toggleAvailability);
            calendar.appendChild(dayElement);
        }
    }

    function updateCalendarAvailability() {
        if (!state.currentUser) return;
        document.querySelectorAll('#availabilityCalendar .calendar-day').forEach(day => {
            if (state.currentUser.availability[day.dataset.date]) {
                day.classList.add('available');
            } else {
                day.classList.remove('available');
            }
        });
    }

    function toggleAvailability(event) {
        if (!state.currentUser) {
            alert('Please save your profile first!');
            return;
        }
        const day = event.target;
        const date = day.dataset.date;
        if (!state.currentUser.availability) state.currentUser.availability = {};
        
        day.classList.toggle('available');
        if (day.classList.contains('available')) {
            state.currentUser.availability[date] = true;
        } else {
            delete state.currentUser.availability[date];
        }
    }

    function saveAvailability() {
        if (!state.currentUser) return;
        saveState();
        alert('Availability saved!');
    }

    function displayGroupAvailability(profile, containerId) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        const today = new Date();
        for (let i = 0; i < 28; i++) {
            const date = new Date();
            date.setDate(today.getDate() + i);
            const dateString = date.toISOString().split('T')[0];
            const dayEl = document.createElement('div');
            dayEl.className = 'group-calendar-day';
            dayEl.textContent = date.getDate();

            const userAvailable = state.currentUser.availability[dateString];
            const otherAvailable = profile.availability && profile.availability[dateString];

            if (userAvailable && otherAvailable) {
                dayEl.classList.add('mutual-available');
                dayEl.title = 'You are both available!';
            } else if (userAvailable) {
                dayEl.classList.add('self-available');
            } else if (otherAvailable) {
                dayEl.classList.add('other-available');
            }
            container.appendChild(dayEl);
        }
    }

    // --- PRINT CARD ---
    function generatePrintCard() {
        if (!state.currentUser) {
            alert('Please save your profile first!');
            return;
        }
        
        const printCard = document.createElement('div');
        printCard.className = 'print-card print-only';
        
        const preferencesList = Object.keys(state.currentUser.preferences).map(category => {
            const prefs = state.currentUser.preferences[category].map(getPreferenceTextById).join('\n• ');
            return `<div style="margin-bottom: 10px;"><strong>${category.charAt(0).toUpperCase() + category.slice(1)}:</strong><br>• ${prefs}</div>`;
        }).join('');

        const profileUrl = `https://my-awesome-app.com/profile/${state.currentUser.id}`;
        
        printCard.innerHTML = `
            <h3>💕 ${state.currentUser.name}'s Preferences Card 💕</h3>
            <div style="text-align: center; margin-bottom: 15px;">
                <strong>Age:</strong> ${state.currentUser.age} | <strong>Experience:</strong> ${state.currentUser.experience}
            </div>
            ${preferencesList}
            <div style="margin-bottom: 10px;">
                <strong>🌈 Sensory Notes:</strong> ${state.currentUser.stimulation || 'N/A'}
            </div>
            ${state.currentUser.scripts ? `<div style="margin-bottom: 10px;"><strong>💬 Conversation Helpers:</strong> ${state.currentUser.scripts}</div>` : ''}
            <div id="print-qrcode"></div>
            <div style="text-align: center; margin-top: 15px; font-size: 12px; color: #666;">
                Scan to see my full profile on Personal Group Coordination App 💖
            </div>
        `;
        
        document.body.appendChild(printCard);

        // Generate QR Code
        const qr = qrcode(0, 'L');
        qr.addData(profileUrl); // This would be the actual URL to the user's profile
        qr.make();
        document.getElementById('print-qrcode').innerHTML = qr.createImgTag(4);

        window.print();
        document.body.removeChild(printCard);
    }
    
    // --- SAMPLE DATA for first-time use ---
    function loadSampleData() {
        state.profiles = [
            { id: 'user_1', name: 'Alex', age: 28, bio: 'I like clear communication and prefer to warm up with some chat first.', preferences: { initiation: ['init_ask'], verbal: ['verb_some'], comfort: ['comfort_cuddle'] }, experience: 'some', stimulation: 'Softer lighting, no sudden loud sounds', interestedIn: {}, availability: { "2024-08-10": true, "2024-08-11": true }, blocked: [] },
            { id: 'user_2', name: 'Jordan', age: 32, bio: 'Direct and straightforward. I like to take charge and prefer minimal talking.', preferences: { initiation: ['init_self'], verbal: ['verb_min'], comfort: ['comfort_leave'] }, experience: 'experienced', stimulation: 'Firm touch, don\'t mind noise', interestedIn: {}, availability: { "2024-08-11": true, "2024-08-17": true }, blocked: [] }
        ];
    }

    // --- RUN APP ---
    init();
});
