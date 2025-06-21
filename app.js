document.addEventListener('DOMContentLoaded', function() {
    // --- STATE MANAGEMENT ---
    let state = {
        currentUser: null,
        profiles: [],
        theme: 'default', // 'default' or 'calm'
        currentProfileStep: 1,
        preferences: {
             'initiation': [ { id: 'init_other', text: '💖 Others to make the first move' }, { id: 'init_ask', text: '🗣️ To be asked before anything starts' }, { id: 'init_self', text: '🌟 I like to initiate things myself' } ],
             'verbal': [ { id: 'verb_min', text: '🤫 Minimal talking during play' }, { id: 'verb_some', text: '💬 Some verbal communication' }, { id: 'verb_non', text: '👋 Non-verbal cues and signals' } ],
             'boundaries': [ { id: 'bound_verbal', text: '🗣️ Verbally upfront' }, { id: 'bound_written', text: '📝 Written discussions beforehand' }, { id: 'bound_signals', text: '🚨 Safe words/signals during play' } ],
             'comfort': [ { id: 'comfort_cuddle', text: '🛋️ Cuddle/chat time afterwards' }, { id: 'comfort_leave', text: '🏃‍♀️ I like to leave soon after' }, { id: 'comfort_breaks', text: '☕ I need breaks' } ]
        }
    };

    // --- INITIALIZATION ---
    function init() {
        loadState();
        applyTheme();
        setupEventListeners();
        setupPreferenceAccordions();
        if (state.currentUser) {
            showFullProfile();
        } else {
            showProfileWizard();
        }
        displayProfiles();
        updateMatches();
    }

    function setupEventListeners() {
        document.querySelector('.nav').addEventListener('click', (e) => {
            if (e.target.matches('.nav-btn')) showSection(e.target.dataset.section);
        });
        document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);
        document.getElementById('profile-wizard').addEventListener('click', handleWizardClick);
        document.getElementById('editProfileBtn').addEventListener('click', showProfileWizard);
        document.getElementById('printCardBtn').addEventListener('click', generatePrintCard);
        
        // Modal Listeners
        const modal = document.getElementById('interaction-guide-modal');
        modal.querySelector('.modal-close').addEventListener('click', () => modal.style.display = 'none');
        modal.querySelector('#start-chat-btn').addEventListener('click', () => {
            alert("In a real app, this would open a secure chat window. For now, we'll close this guide.");
            modal.style.display = 'none';
        });
    }

    // --- STATE & THEME ---
    function saveState() { localStorage.setItem('appState', JSON.stringify(state)); }
    function loadState() {
        const savedState = localStorage.getItem('appState');
        if (savedState) {
            state = JSON.parse(savedState);
        } else {
            loadSampleData();
        }
    }
    function toggleTheme() {
        state.theme = state.theme === 'default' ? 'calm' : 'default';
        applyTheme();
        saveState();
    }
    function applyTheme() {
        document.body.className = state.theme === 'calm' ? 'calm-mode' : '';
        document.getElementById('theme-toggle-btn').textContent = state.theme === 'calm' ? '💖' : '🌙';
    }

    // --- PROFILE WIZARD & DISPLAY ---
    function showProfileWizard() {
        state.currentProfileStep = 1;
        updateWizardStep();
        populateProfileForm();
        document.getElementById('profile-wizard').style.display = 'block';
        document.getElementById('profile-display').style.display = 'none';
    }

    function showFullProfile() {
        document.getElementById('profile-wizard').style.display = 'none';
        document.getElementById('profile-display').style.display = 'block';
    }
    
    function handleWizardClick(e) {
        if (e.target.matches('.wizard-next')) {
            state.currentProfileStep++;
            updateWizardStep();
        } else if (e.target.matches('.wizard-back')) {
            state.currentProfileStep--;
            updateWizardStep();
        } else if (e.target.matches('#saveProfileBtn')) {
            handleProfileSave();
        }
    }

    function updateWizardStep() {
        document.querySelectorAll('.wizard-step').forEach(step => step.classList.remove('active'));
        document.querySelector(`.wizard-step[data-step="${state.currentProfileStep}"]`).classList.add('active');
        const progress = (state.currentProfileStep / 4) * 100;
        document.querySelector('.progress-bar-fill').style.width = `${progress}%`;
    }

    function handleProfileSave() {
        const isNewUser = !state.currentUser;
        const prompts = {
            communication: document.getElementById('prompt-communication').value,
            comfort: document.getElementById('prompt-comfort').value,
            interaction: document.getElementById('prompt-interaction').value
        };
        const preferences = {};
        Object.keys(state.preferences).forEach(cat => {
            preferences[cat] = Array.from(document.querySelectorAll(`input[data-category="${cat}"]:checked`)).map(cb => cb.id);
        });

        state.currentUser = {
            id: state.currentUser?.id || 'user_' + Date.now(),
            name: document.getElementById('name').value,
            age: document.getElementById('age').value,
            experience: document.getElementById('experience').value,
            prompts: prompts,
            preferences: preferences,
            stimulation: document.getElementById('stimulation').value,
            interestedIn: state.currentUser?.interestedIn || {},
            interactions: state.currentUser?.interactions || {}
        };
        
        const profileIndex = state.profiles.findIndex(p => p.id === state.currentUser.id);
        if (profileIndex > -1) {
            state.profiles[profileIndex] = state.currentUser;
        } else {
            state.profiles.push(state.currentUser);
        }

        saveState();
        alert('Profile saved successfully!');
        showFullProfile();
        displayProfiles();
        updateMatches();
    }

    function populateProfileForm() {
        if (!state.currentUser) return;
        const u = state.currentUser;
        document.getElementById('name').value = u.name || '';
        document.getElementById('age').value = u.age || '';
        document.getElementById('experience').value = u.experience || 'new';
        document.getElementById('prompt-communication').value = u.prompts?.communication || '';
        document.getElementById('prompt-comfort').value = u.prompts?.comfort || '';
        document.getElementById('prompt-interaction').value = u.prompts?.interaction || '';
        document.getElementById('stimulation').value = u.stimulation || '';
        
        document.querySelectorAll('#preferencesAccordion input[type="checkbox"]').forEach(cb => cb.checked = false);
        Object.keys(u.preferences).forEach(cat => {
            u.preferences[cat].forEach(prefId => {
                const checkbox = document.getElementById(prefId);
                if (checkbox) checkbox.checked = true;
            });
        });
    }

    // --- UI SETUP (Accordions, etc.) ---
    function setupPreferenceAccordions() {
        const container = document.getElementById('preferencesAccordion');
        container.innerHTML = '';
        Object.keys(state.preferences).forEach(category => {
            const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);
            const accordionItem = document.createElement('div');
            accordionItem.innerHTML = `<div class="accordion-header">${categoryTitle}</div>`;
            const panel = document.createElement('div');
            panel.className = 'accordion-panel';
            const checkboxGroup = document.createElement('div');
            checkboxGroup.className = 'checkbox-group';
            state.preferences[category].forEach(option => {
                checkboxGroup.innerHTML += `
                    <div class="checkbox-item">
                        <input type="checkbox" id="${option.id}" data-category="${category}">
                        <label for="${option.id}">${option.text}</label>
                    </div>`;
            });
            panel.appendChild(checkboxGroup);
            accordionItem.appendChild(panel);
            container.appendChild(accordionItem);
        });
        container.addEventListener('click', e => {
            if (e.target.matches('.accordion-header')) {
                e.target.classList.toggle('active');
                e.target.nextElementSibling.style.display = e.target.classList.contains('active') ? 'block' : 'none';
            }
        });
    }

    // --- BROWSE & MATCHING LOGIC ---
    function displayProfiles() {
        const container = document.getElementById('profilesList');
        if (!state.currentUser) {
            container.innerHTML = '<p class="step-intro">Create your profile to browse others.</p>'; return;
        }
        const visibleProfiles = state.profiles.filter(p => p.id !== state.currentUser.id && state.currentUser.interactions[p.id] !== 'hidden');
        container.innerHTML = visibleProfiles.map(p => createProfileCardHTML(p)).join('');
        container.addEventListener('click', handleProfileCardClick);
    }

    function createProfileCardHTML(profile) {
        const { green, yellow } = calculateCompatibility(state.currentUser, profile);
        return `
            <div class="profile-card" data-profile-id="${profile.id}">
                <div class="profile-name">${profile.name}, ${profile.age}</div>
                <p style="color: #666; margin-top: 5px;">${profile.prompts.communication}</p>
                ${green.length > 0 ? `<div class="compatibility-notes"><ul>${green.map(n => `<li>✔️ ${n}</li>`).join('')}</ul></div>` : ''}
                ${yellow.length > 0 ? `<div class="compatibility-notes yellow"><ul>${yellow.map(n => `<li>⚠️ ${n}</li>`).join('')}</ul></div>` : ''}
                <div class="match-actions">
                    <button class="match-btn explore-btn" data-action="explore">Explore Connection</button>
                    <button class="match-btn hide-btn" data-action="hide">Not a Fit For Now</button>
                </div>
            </div>`;
    }

    function handleProfileCardClick(e) {
        if (!e.target.matches('.match-btn')) return;
        const card = e.target.closest('.profile-card');
        const profileId = card.dataset.profileId;
        const action = e.target.dataset.action;

        if (action === 'explore') {
            state.currentUser.interestedIn[profileId] = true;
            const otherProfile = state.profiles.find(p => p.id === profileId);
            // For demo, we auto-reciprocate interest
            if(otherProfile) otherProfile.interestedIn[state.currentUser.id] = true; 
            alert(`You've expressed interest in ${otherProfile.name}. If it's mutual, they'll appear in your 'Mutual Interests' tab.`);
        } else if (action === 'hide') {
            state.currentUser.interactions[profileId] = 'hidden';
            card.style.transition = 'opacity 0.5s, transform 0.5s';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.95)';
            setTimeout(() => card.remove(), 500);
        }
        saveState();
        updateMatches();
    }

    function calculateCompatibility(user1, user2) {
        const green = [], yellow = [];
        // Green flags (direct positive matches)
        if (user1.preferences.initiation.includes('init_self') && user2.preferences.initiation.includes('init_other')) green.push(`${user2.name} likes others to initiate, and you like to initiate!`);
        if (user2.preferences.initiation.includes('init_self') && user1.preferences.initiation.includes('init_other')) green.push(`You like others to initiate, and ${user2.name} likes to initiate!`);
        if (user1.preferences.comfort.includes('comfort_cuddle') && user2.preferences.comfort.includes('comfort_cuddle')) green.push(`You both enjoy cuddling afterwards.`);
        // Yellow flags (differences to discuss)
        if (user1.preferences.verbal.includes('verb_min') && !user2.preferences.verbal.includes('verb_min')) yellow.push(`You prefer minimal talking, while ${user2.name} is more verbal. Good to chat about!`);
        if (!user1.preferences.verbal.includes('verb_min') && user2.preferences.verbal.includes('verb_min')) yellow.push(`${user2.name} prefers minimal talking, while you are more verbal. Good to chat about!`);
        return { green, yellow };
    }

    // --- MUTUAL MATCHES & INTERACTION GUIDE ---
    function updateMatches() {
        const container = document.getElementById('mutualMatches');
        if (!state.currentUser) { container.innerHTML = ''; return; }
        const mutuals = state.profiles.filter(p => state.currentUser.interestedIn[p.id] && p.interestedIn?.[state.currentUser.id]);
        
        if (mutuals.length === 0) {
            container.innerHTML = '<p class="step-intro">No mutual interests yet. Keep exploring!</p>';
            return;
        }
        container.innerHTML = mutuals.map(p => `
            <div class="profile-card mutual-match">
                <div class="profile-name">🎉 You and ${p.name} are interested!</div>
                <button class="btn" onclick="app.openInteractionGuide('${p.id}')" style="margin-top: 15px;">View Interaction Guide</button>
            </div>
        `).join('');
    }

    function openInteractionGuide(profileId) {
        const partner = state.profiles.find(p => p.id === profileId);
        if (!partner) return;
        
        document.getElementById('guide-title').textContent = `Interaction Guide for You & ${partner.name}`;

        // Shared Ground
        const { green } = calculateCompatibility(state.currentUser, partner);
        document.getElementById('guide-shared-ground').innerHTML = green.length > 0
            ? green.map(n => `<li>${n}</li>`).join('')
            : `<li>You both expressed interest in connecting! That's a great start.</li>`;
            
        // Notes
        document.getElementById('guide-notes').innerHTML = `
            <div class="note-block"><strong>For interacting with ${partner.name}:</strong><br>${partner.prompts.comfort}</div>
            <div class="note-block"><strong>For interacting with you:</strong><br>${state.currentUser.prompts.comfort}</div>`;

        // Icebreakers
        document.getElementById('guide-icebreakers').innerHTML = `
            <li>"Hey ${partner.name}! I saw on our guide we're a potential match. I was drawn to your profile because..."</li>
            <li>"Hi! The guide mentioned you feel comfortable when <em>'${partner.prompts.comfort}'</em>. I'd love to hear more about what that means to you."</li>
            <li>"I see your preferred way to start a chat is <em>'${partner.prompts.interaction}'</em>, so I'm giving it a try! How's your day?"</li>`;

        document.getElementById('interaction-guide-modal').style.display = 'flex';
    }

    // --- UTILITIES & GLOBAL ACCESS ---
    function getPreferenceTextById(id) { /* ... for print card ... */ }
    function generatePrintCard() { /* ... unchanged ... */ }
    function loadSampleData() {
        state.profiles = [
            { id: 'user_1', name: 'Alex', age: 28, experience: 'some', prompts: { communication: 'Direct and clear.', comfort: 'I like when we have a plan first.', interaction: 'Ask me about my latest hobby.' }, preferences: { initiation: ['init_ask'], verbal: ['verb_some'], comfort: ['comfort_cuddle'] }, stimulation: 'Softer lighting', interestedIn: {}, interactions: {} },
            { id: 'user_2', name: 'Jordan', age: 32, experience: 'experienced', prompts: { communication: 'I like to take the lead.', comfort: 'I feel good when things flow naturally.', interaction: 'Just say hi!' }, preferences: { initiation: ['init_self'], verbal: ['verb_min'], comfort: ['comfort_leave'] }, stimulation: 'I like background music', interestedIn: {}, interactions: {} }
        ];
    }
    
    // Expose necessary functions to global scope for onclick handlers
    window.app = { openInteractionGuide };
    
    // --- RUN APP ---
    init();
});
