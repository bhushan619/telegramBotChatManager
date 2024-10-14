// Define your bot token (replace with your actual bot token)
const BOT_TOKEN = 'YOUR_TELEGRAM_API_TOKEN';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${BOT_TOKEN}/`;
let lastUpdateId = 0;
let users = {};  // To store multiple users with their chatId, username, and chat logs
let currentChatId = null;  // To keep track of the currently active chat tab
let selectedFile = null;   // To store the selected image/video file

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
        const messages = users[currentChatId].messages;
        chatArea.innerHTML = messages.join(''); // Use innerHTML to allow rendering HTML (for images, videos, etc.)
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

        li.id = `user-${chatId}`;
        li.classList.add('user-item');

        li.innerHTML = `
            <span>${username}</span>
            <span class="badge" id="badge-${chatId}" style="display: none;"></span>
        `;
        li.addEventListener('click', () => openUserTab(chatId));
        userList.appendChild(li);
    });
}

// Open a new tab for the user chat
function openUserTab(chatId) {
    currentChatId = chatId;

    // Clear badge when the user is selected
    const badge = document.getElementById(`badge-${chatId}`);
    if (badge) badge.style.display = 'none';

    // Highlight selected user
    const userItems = document.querySelectorAll('.user-item');
    userItems.forEach(item => item.classList.remove('active'));
    document.getElementById(`user-${chatId}`).classList.add('active');

    if (!document.getElementById(`tab-${chatId}`)) {
        const tabs = document.getElementById('tabs');
        const tab = document.createElement('div');
        tab.className = 'tab active';
        tab.id = `tab-${chatId}`;
        const username = users[chatId].username || `User ID: ${chatId}`;
        tab.innerHTML = `${username} <button class="btn btn-danger btn-sm" onclick="closeTab('${chatId}')">X</button>`;
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

// Send a text message using the bot
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
            logEvent(chatId, `<p style="text-align:right"><b>You</b>: ${message}</p>`);
        } else {
            logEvent(chatId, `<p>Error sending message: ${data.description}</p>`);
        }
    })
    .catch(error => logEvent(chatId, `<p>Fetch error: ${error}</p>`));
}

// Send image or video using the bot
function sendMedia(chatId, file, type) {
    const url = `${TELEGRAM_API_URL}${type}`; // "sendPhoto" or "sendVideo"
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append(type === 'sendPhoto' ? 'photo' : 'video', file);

    fetch(url, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.ok) {
            logEvent(chatId, `<p style="text-align:right"><b>You</b>: Sent ${type === 'sendPhoto' ? 'an image' : 'a video'}</p>`);
        } else {
            logEvent(chatId, `<p>Error sending media: ${data.description}</p>`);
        }
    })
    .catch(error => logEvent(chatId, `<p>Fetch error: ${error}</p>`));
}

// Handle file selection (image or video)
document.getElementById('fileInput').addEventListener('change', (event) => {
    selectedFile = event.target.files[0];
    if (!selectedFile) {
        alert('No file selected!');
        return;
    }

    const fileType = selectedFile.type.split('/')[0];
    if (fileType === 'image') {
        sendMedia(currentChatId, selectedFile, 'sendPhoto');
    } else if (fileType === 'video') {
        sendMedia(currentChatId, selectedFile, 'sendVideo');
    } else {
        alert('Please select a valid image or video file.');
    }

    event.target.value = '';  // Reset file input
});

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

// Send image button listener
document.getElementById('uploadImageBtn').addEventListener('click', () => {
    document.getElementById('fileInput').click();  // Open file dialog to select image
});

// Send video button listener
document.getElementById('uploadVideoBtn').addEventListener('click', () => {
    document.getElementById('fileInput').click();  // Open file dialog to select video
});

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
                        const messageText = update.message.text || '';
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

                        // Detect and log the type of content (text, emoji, image, video, etc.)
                        if (update.message.photo) {
                            const fileId = update.message.photo[update.message.photo.length - 1].file_id;
                            const photoUrl = `${TELEGRAM_API_URL}getFile?file_id=${fileId}`;
                            fetch(photoUrl)
                                .then(response => response.json())
                                .then(fileData => {
                                    const imageUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;
                                    logEvent(chatId, `<p><b>${username}</b>: <img src="${imageUrl}" alt="Image" width="150"></p>`);
                                });
                        } else if (update.message.video) {
                            const fileId = update.message.video.file_id;
                            const videoUrl = `${TELEGRAM_API_URL}getFile?file_id=${fileId}`;
                            fetch(videoUrl)
                                .then(response => response.json())
                                .then(fileData => {
                                    const videoLink = `https://api.telegram.org/file/bot${BOT_TOKEN}/${fileData.result.file_path}`;
                                    logEvent(chatId, `<p><b>${username}</b>: <video controls width="250"><source src="${videoLink}" type="video/mp4">Your browser does not support the video tag.</video></p>`);
                                });
                        } else {
                            logEvent(chatId, `<p><b>${username}</b>: ${messageText}</p>`);
                        }

                        // Show badge if a new message is received and user is not selected
                        if (currentChatId !== chatId) {
                            const badge = document.getElementById(`badge-${chatId}`);
                            if (badge) badge.style.display = 'inline';
                        }
                    }
                });
            } else {
                console.log(`Error fetching updates: ${data.description}`);
            }
        })
        .catch(error => console.log(`Fetch error: ${error}`));
}

// Poll the Telegram server every 3 seconds for updates
setInterval(getUpdates, 3000);
