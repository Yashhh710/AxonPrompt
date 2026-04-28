const CATEGORIES = {
    "GENERATION": {
        "Text": ["Blog", "Essay", "Story", "Poem", "Email"],
        "Code": ["Snippet", "Function", "Web Page", "Mobile App"],
        "Art": ["Illustration", "Logo", "Portrait", "Landscape"],
        "Image": ["Photo-realistic", "Abstract", "Anime", "3D Render", "Pixel Art"]
    },
    "TRANSFORMATION": ["Translation", "Summarization", "Paraphrasing", "Stylizing"],
    "ANALYSIS": ["Data Analysis", "Sentiment Analysis", "Sentiment Analysis", "Logic Check"],
    "INTERACTIVE": ["Roleplay", "Debate", "Socratic Tutor", "Coach"],
    "CREATIVE": ["World Building", "Character Backstory", "Plot Twist"],
    "SYSTEM / META": ["Prompt Template", "AI Persona", "Ruleset"],
    "OPTIMIZATION": ["SEO", "Conversion Rate", "Clarity"],
    "BUSINESS": ["Marketing Plan", "Pitch Deck", "Competitor Analysis"],
    "PRODUCTIVITY": ["Meeting Notes", "Schedule", "Task List"],
    "DATA / API": ["JSON Schema", "SQL Query", "API Documentation"],
    "SECURITY": ["Pentest Simulation", "Code Audit", "Privacy Policy"],
    "PERSONALIZATION": ["Email Campaign", "Gift Idea", "Travel Itinerary"],
    "ADVANCED SYSTEMS": ["Chain of Thought", "Tree of Thoughts", "Few-Shot"]
};

const appState = {
    currentScreen: 'disclaimer',
    selectionPath: [],
    userGoal: '',
    mode: '', // 'guided' or 'custom'
    customInstructions: '',
    dynamicHistory: [], // Stores [{role: 'user', content: ''}, {role: 'assistant', content: ''}]
    currentQuestion: null,
    questions: [], // No longer used for static questions
    currentQuestionIndex: 0,
    answers: {},
    prompts: {
        basic: '',
        improved: '',
        expert: ''
    },
    history: JSON.parse(localStorage.getItem('axon_history') || '[]'),
    stepHistory: [] // To track navigation
};

// UI Elements
const disclaimerScreen = document.getElementById('disclaimer-screen');
const mainFlow = document.getElementById('main-flow');
const startBtn = document.getElementById('start-btn');
const categoryTree = document.getElementById('category-tree');
const currentPathEl = document.getElementById('current-path');
const userGoalInput = document.getElementById('user-goal');
const nextBtnToQuestions = document.getElementById('next-to-questions');
const flowSteps = document.querySelectorAll('.flow-step');
const progressBar = document.getElementById('main-progress');
const stepText = document.getElementById('step-text');
const questionContainer = document.getElementById('question-container');
const optionsGrid = document.getElementById('options-grid');
const questionText = document.getElementById('current-question-text');
const questionCountText = document.getElementById('question-count-text');
const aiSuggestionText = document.getElementById('suggestion-text');
const toast = document.getElementById('toast');
const restartBtn = document.getElementById('restart-btn');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    renderCategoryTree(CATEGORIES, categoryTree);
    setupEventListeners();
});

function setupEventListeners() {
    startBtn.addEventListener('click', () => {
        disclaimerScreen.classList.add('hidden');
        mainFlow.classList.remove('hidden');
        showStep('input-step');
    });

    userGoalInput.addEventListener('input', (e) => {
        appState.userGoal = e.target.value;
        document.getElementById('next-to-mode').disabled = appState.userGoal.trim().length < 5;
    });

    document.getElementById('next-to-mode').addEventListener('click', () => {
        showStep('mode-step');
    });

    document.getElementById('mode-guided').addEventListener('click', () => {
        appState.mode = 'guided';
        startRefinement();
    });

    document.getElementById('mode-custom').addEventListener('click', () => {
        appState.mode = 'custom';
        showStep('custom-step');
    });

    document.getElementById('custom-instructions').addEventListener('input', (e) => {
        appState.customInstructions = e.target.value;
    });

    document.getElementById('next-to-final-from-custom').addEventListener('click', () => {
        generateFinalPrompts(true);
    });

    document.getElementById('hybrid-refine-btn').addEventListener('click', () => {
        startRefinement(true); // true for hybrid
    });

    document.getElementById('save-btn').addEventListener('click', saveToHistory);

    document.getElementById('toggle-sidebar').addEventListener('click', toggleSidebar);
    document.getElementById('floating-sidebar-trigger').addEventListener('click', toggleSidebar);

    function toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mainFlow = document.getElementById('main-flow');
        const floatingTrigger = document.getElementById('floating-sidebar-trigger');
        
        sidebar.classList.toggle('collapsed');
        mainFlow.classList.toggle('sidebar-collapsed');
        
        if (sidebar.classList.contains('collapsed')) {
            floatingTrigger.classList.remove('hidden');
        } else {
            floatingTrigger.classList.add('hidden');
        }
    }

    document.getElementById('hide-categories').addEventListener('click', () => {
        const tree = document.getElementById('category-tree');
        tree.classList.toggle('hidden');
        document.getElementById('hide-categories').innerText = tree.classList.contains('hidden') ? '+' : '×';
    });

    document.getElementById('back-btn').addEventListener('click', goBack);

    document.querySelectorAll('.example-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            userGoalInput.value = chip.innerText;
            userGoalInput.dispatchEvent(new Event('input'));
        });
    });

    restartBtn.addEventListener('click', () => {
        window.location.reload();
    });

    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const text = document.getElementById(targetId).innerText;
            navigator.clipboard.writeText(text);
            showToast('Copied to clipboard!');
        });
    });
}

function renderCategoryTree(data, container, path = []) {
    for (const key in data) {
        const li = document.createElement('li');
        li.className = 'tree-item';
        
        const label = document.createElement('div');
        label.className = 'tree-label';
        
        const isObject = typeof data[key] === 'object' && !Array.isArray(data[key]);
        const isArray = Array.isArray(data[key]);
        const currentPath = [...path, key];

        if (isObject || isArray) {
            const toggle = document.createElement('span');
            toggle.className = 'tree-toggle';
            toggle.innerHTML = '▶';
            label.appendChild(toggle);
        } else {
            const dot = document.createElement('span');
            dot.className = 'tree-toggle';
            dot.innerHTML = '•';
            label.appendChild(dot);
        }

        const text = document.createElement('span');
        text.innerText = key;
        label.appendChild(text);

        label.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Toggle expansion
            if (isObject || isArray) {
                const childContainer = li.querySelector('.tree-children');
                if (childContainer) {
                    childContainer.classList.toggle('hidden');
                    label.querySelector('.tree-toggle').classList.toggle('expanded');
                }
            }

            // Select
            document.querySelectorAll('.tree-label').forEach(el => el.classList.remove('active'));
            label.classList.add('active');
            appState.selectionPath = currentPath;
            currentPathEl.innerHTML = `<span>${currentPath.join(' > ')}</span>`;
        });

        li.appendChild(label);

        if (isObject || isArray) {
            const childUl = document.createElement('ul');
            childUl.className = 'tree-children hidden';
            
            if (isArray) {
                data[key].forEach(item => {
                    const itemData = {};
                    itemData[item] = null; // Leaf node
                    renderCategoryTree(itemData, childUl, currentPath);
                });
            } else {
                renderCategoryTree(data[key], childUl, currentPath);
            }
            
            li.appendChild(childUl);
        }

        container.appendChild(li);
    }
}

async function startRefinement(isHybrid = false) {
    const btn = isHybrid ? document.getElementById('hybrid-refine-btn') : document.getElementById('mode-guided');
    setLoading(true, 'Analyzing Intent...', btn);
    
    appState.dynamicHistory = [];
    appState.currentQuestionIndex = 0;

    const systemPrompt = `Act as a prompt-building assistant.
Your job is to ask ONE relevant multiple-choice question at a time to improve a user's AI prompt.

Rules:
* Ask only ONE question
* Provide EXACTLY 3 clear options
* Keep it simple
* Base the next question on previous answers
* After 3–5 questions, stop asking and return 'FINAL_READY'

Return format strictly in JSON:
{
"question": "Your question here",
"options": ["Option 1", "Option 2", "Option 3"],
"nextStep": "continue"
}

OR when done:
{
"nextStep": "final"
}`;

    const userGoalContext = `User Goal: ${appState.userGoal}\nCategory: ${appState.selectionPath.join(' > ')}`;
    if (isHybrid) {
        appState.dynamicHistory.push({ role: "user", content: `${userGoalContext}\nCustom Instructions: ${appState.customInstructions}` });
    } else {
        appState.dynamicHistory.push({ role: "user", content: userGoalContext });
    }

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [
                    { role: "system", content: systemPrompt },
                    ...appState.dynamicHistory
                ]
            })
        });

        const data = await response.json();
        const content = data.choices[0].message.content;
        const jsonStr = content.substring(content.indexOf('{'), content.lastIndexOf('}') + 1);
        const parsed = JSON.parse(jsonStr);
        
        appState.currentQuestion = parsed;
        appState.dynamicHistory.push({ role: "assistant", content: content });
        
        showStep('questions-step');
        renderQuestion();
    } catch (error) {
        console.error(error);
        alert('Failed to generate the first question. Please try again.');
    } finally {
        setLoading(false, '', btn);
    }
}

function renderQuestion() {
    const q = appState.currentQuestion;
    if (!q || q.nextStep === 'final') {
        generateFinalPrompts();
        return;
    }

    questionText.innerText = q.question;
    questionCountText.innerText = `Step ${appState.currentQuestionIndex + 1}`;
    aiSuggestionText.innerText = "The AI is tailoring these questions to your specific goal.";
    
    optionsGrid.innerHTML = '';
    q.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.innerText = opt;
        btn.onclick = () => selectOption(opt);
        optionsGrid.appendChild(btn);
    });

    // Add "Other" option for manual type-in
    const otherBtn = document.createElement('button');
    otherBtn.className = 'option-btn other-option-btn';
    otherBtn.innerHTML = '<i class="fas fa-edit"></i> Other (Type own...)';
    otherBtn.onclick = () => {
        const customValue = prompt("Enter your custom answer:");
        if (customValue && customValue.trim() !== "") {
            selectOption(customValue.trim());
        }
    };
    optionsGrid.appendChild(otherBtn);

    // Update progress bar roughly
    const progress = Math.min(25 + (appState.currentQuestionIndex * 15), 85);
    progressBar.style.width = progress + '%';
}

async function selectOption(option) {
    appState.currentQuestionIndex++;
    appState.dynamicHistory.push({ role: "user", content: `My choice: ${option}` });
    
    setLoading(true, 'Processing...', document.querySelector('.questions-step .primary-btn')); // Just for visuals

    try {
        const systemPrompt = `Act as a prompt-building assistant. 
Return format strictly in JSON:
{
"question": "Your question here",
"options": ["Option 1", "Option 2", "Option 3"],
"nextStep": "continue"
}
OR when done:
{
"nextStep": "final"
}

Rule: Provide EXACTLY 3 clear options.`;

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [
                    { role: "system", content: systemPrompt },
                    ...appState.dynamicHistory
                ]
            })
        });

        const data = await response.json();
        const content = data.choices[0].message.content;
        const jsonStr = content.substring(content.indexOf('{'), content.lastIndexOf('}') + 1);
        const parsed = JSON.parse(jsonStr);
        
        appState.currentQuestion = parsed;
        appState.dynamicHistory.push({ role: "assistant", content: content });

        if (parsed.nextStep === 'final') {
            generateFinalPrompts();
        } else {
            renderQuestion();
        }
    } catch (error) {
        console.error(error);
        alert('Failed to get the next question.');
    } finally {
        setLoading(false);
    }
}

async function generateFinalPrompts(isCustom = false) {
    const btn = isCustom ? document.getElementById('next-to-final-from-custom') : null;
    showStep('output-step');
    setLoading(true, 'Engineering Final Prompts...', btn);
    
    try {
        const refinementHistory = appState.dynamicHistory.filter(m => m.role === 'user').map(m => m.content).join('\n');
        const userContext = isCustom 
            ? `Goal: ${appState.userGoal}\nCategory: ${appState.selectionPath.join(' > ')}\nInstructions: ${appState.customInstructions}`
            : `Goal: ${appState.userGoal}\nCategory: ${appState.selectionPath.join(' > ')}\nRefinement Path:\n${refinementHistory}`;

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [
                    {
                        role: "system",
                        content: "Generate a high-quality AI prompt using this data. Provide 3 versions: basic, improved, and expert. Return JSON: { basic: '', improved: '', expert: '' }"
                    },
                    {
                        role: "user",
                        content: userContext
                    }
                ]
            })
        });

        const data = await response.json();
        const content = data.choices[0].message.content;
        const jsonStr = content.substring(content.indexOf('{'), content.lastIndexOf('}') + 1);
        const parsed = JSON.parse(jsonStr);
        
        appState.prompts = {
            basic: parsed.basic,
            improved: parsed.improved,
            expert: parsed.expert
        };

        document.getElementById('prompt-basic').innerText = parsed.basic;
        document.getElementById('prompt-improved').innerText = parsed.improved;
        document.getElementById('prompt-expert').innerText = parsed.expert;
    } catch (error) {
        console.error(error);
    } finally {
        setLoading(false);
    }
}

function showStep(stepId) {
    if (appState.stepHistory[appState.stepHistory.length - 1] !== stepId) {
        appState.stepHistory.push(stepId);
    }
    
    flowSteps.forEach(step => {
        step.classList.remove('active');
        if (step.id === stepId) step.classList.add('active');
    });
    
    // Scroll content area back to top
    document.getElementById('content-area').scrollTo({ top: 0, behavior: 'smooth' });

    const steps = ['input-step', 'mode-step', 'custom-step', 'questions-step', 'output-step'];
    const index = steps.indexOf(stepId);
    
    // Update Back button visibility
    const backBtn = document.getElementById('back-btn');
    if (index > 0) {
        backBtn.classList.remove('hidden');
    } else {
        backBtn.classList.add('hidden');
    }

    const progress = ((index + 1) / steps.length) * 100;
    progressBar.style.width = progress + '%';
    stepText.innerText = `Step ${index + 1} of ${steps.length}`;
}

function goBack() {
    if (appState.stepHistory.length > 1) {
        appState.stepHistory.pop(); // Remove current step
        const prevStep = appState.stepHistory[appState.stepHistory.length - 1];
        
        // Reset state logic if needed (e.g. if going back from questions)
        if (prevStep === 'mode-step') {
            appState.questions = [];
            appState.answers = {};
        }
        
        showStep(prevStep);
    }
}

function updateProgress() {
    // Keep progress steady during MCQ
}

function setLoading(isLoading, text = 'Processing...', customBtn = null) {
    const targetBtn = customBtn || document.getElementById('next-to-mode');
    const btnText = targetBtn.querySelector('span');
    const loader = targetBtn.querySelector('.loader');
    
    if (isLoading) {
        targetBtn.disabled = true;
        if (btnText) btnText.dataset.originalText = btnText.innerText;
        if (btnText) btnText.innerText = text;
        if (loader) loader.classList.remove('hidden');
    } else {
        targetBtn.disabled = false;
        if (btnText) btnText.innerText = btnText.dataset.originalText || 'Continue';
        if (loader) loader.classList.add('hidden');
    }
}

function showToast(msg) {
    toast.innerText = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

function saveToHistory() {
    const entry = {
        id: Date.now(),
        goal: appState.userGoal,
        path: appState.selectionPath,
        prompts: appState.prompts,
        timestamp: new Date().toISOString()
    };
    
    appState.history.unshift(entry);
    localStorage.setItem('axon_history', JSON.stringify(appState.history));
    showToast('Prompt saved to history!');
}

