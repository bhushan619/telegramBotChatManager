// Define your bot token (replace with your actual bot token)
const BOT_TOKEN = '7870041164:AAHka4CS6Jwyt61-39vMvVRhE-bEj7-77c0';

const TELEGRAM_API_URL = `https://api.telegram.org/bot${BOT_TOKEN}/`;
let lastUpdateId = 0;
let users = {};  // To store multiple users with their chatId, username, and chat logs
let currentChatId = null;  // To keep track of the currently active chat tab

// Function to log events for the selected user
function logEvent(chatId, message) {
    if (!users[chatId]) {
        users[chatId] = { messages: [] };
    }
    users[chatId].messages.push(message);
    updateChatArea();
}

// Function to update the chat area with the selected user's messages
function updateChatArea() {
    const chatArea = document.getElementById('chatArea');
    if (currentChatId && users[currentChatId]) {
        const chatLog = users[currentChatId].messages.join('\n');
        chatArea.innerHTML = `<textarea readonly>${chatLog}</textarea>`;
    } else {
        chatArea.innerHTML = `<textarea readonly></textarea>`;
    }
}

// Update the user list in the sidebar
function updateUserList() {
    const userList = document.getElementById('userList');
    userList.innerHTML = '';

    Object.keys(users).forEach(chatId => {
        const li = document.createElement('li');
        const username = users[chatId].username || `User ID: ${chatId}`;  // Show username if available
        li.textContent = username;
        li.addEventListener('click', () => openUserTab(chatId));
        userList.appendChild(li);
    });
}

// Open a new tab for the user chat
function openUserTab(chatId) {
    currentChatId = chatId;

    if (!document.getElementById(`tab-${chatId}`)) {
        const tabs = document.getElementById('tabs');
        const tab = document.createElement('div');
        tab.className = 'tab active';
        tab.id = `tab-${chatId}`;
        const username = users[chatId].username || `User ID: ${chatId}`;
        tab.innerHTML = `${username} <button onclick="closeTab('${chatId}')">x</button>`;
        tab.addEventListener('click', () => switchTab(chatId));
        tabs.appendChild(tab);
    }

    switchTab(chatId);
}

// Switch to a different user's chat tab
function switchTab(chatId) {
    currentChatId = chatId;

    // Remove 'active' class from all tabs
    const allTabs = document.querySelectorAll('.tab');
    allTabs.forEach(tab => tab.classList.remove('active'));

    // Add 'active' class to the current tab
    const currentTab = document.getElementById(`tab-${chatId}`);
    if (currentTab) {
        currentTab.classList.add('active');
    }

    updateChatArea();
}

// Close a tab
function closeTab(chatId) {
    const tab = document.getElementById(`tab-${chatId}`);
    if (tab) {
        tab.remove();
    }

    // If the closed tab was the active one, clear the chat area
    if (currentChatId === chatId) {
        currentChatId = null;
        updateChatArea();
    }
}

// Send a message using the bot
function sendMessage(chatId, message) {
    const url = `${TELEGRAM_API_URL}sendMessage`;

    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            chat_id: chatId,
            text: message
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.ok) {
            logEvent(chatId, `You: ${message}`);
        } else {
            logEvent(chatId, `Error sending message: ${data.description}`);
        }
    })
    .catch(error => logEvent(chatId, `Fetch error: ${error}`));
}

// Fetch updates using getUpdates method
function getUpdates() {
    const url = `${TELEGRAM_API_URL}getUpdates?offset=${lastUpdateId + 1}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.ok) {
                data.result.forEach(update => {
                    lastUpdateId = update.update_id;  // Store the latest update_id

                    if (update.message) {
                        const chatId = update.message.chat.id;
                        const messageText = update.message.text;
                        const from = update.message.from;
                        const username = from.username || `User ID: ${chatId}`;  // Get username if available

                        // Store user if not already stored
                        if (!users[chatId]) {
                            users[chatId] = { 
                                username,  // Store the username
                                messages: [] 
                            };
                            updateUserList();  // Update the user list in the sidebar
                        }

                        // Log the received message
                        logEvent(chatId, `${username}: ${messageText}`);
                    }
                });
            } else {
                console.log(`Error fetching updates: ${data.description}`);
            }
        })
        .catch(error => console.log(`Fetch error: ${error}`));
}

// Send button event listener
document.getElementById('sendBtn').addEventListener('click', () => {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value;

    if (message.trim() === '' || !currentChatId) {
        alert('Please enter a message and select a user to send the message.');
        return;
    }

    sendMessage(currentChatId, message);
    messageInput.value = '';  // Clear the input field
});

// Poll the Telegram server every 3 seconds for updates
setInterval(getUpdates, 3000);
