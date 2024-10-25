// Get references to DOM elements
const chatArea = document.getElementById('chatArea');
const fileInput = document.getElementById('fileInput');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const uploadImageBtn = document.getElementById('uploadImageBtn');
const uploadVideoBtn = document.getElementById('uploadVideoBtn');
const userList = document.getElementById('userList');

// Telegram bot settings
const botToken = 'YOUR_TELEGRAM_API_TOKEN';
const apiUrl = `https://api.telegram.org/bot${botToken}`;
let lastUpdateId = 0; // Keeps track of the last processed update
let activeChatId = null; // The current active chat ID
let userChats = {}; // Object to store conversations by user (chat_id)


// Function to create a new tab for each user
function createUserTab(userId, userName) {
    if (!userChats[userId]) {
        userChats[userId] = [];
    }
    if (!document.getElementById(`user-${userId}`)) {
        const userTab = document.createElement('div');
        userTab.classList.add('user-item');
		//userTab.classList.add('active');
        userTab.textContent = `${userName}` == `undefined` ? `user-${userId}` : `${userName}`;
        userTab.id = `user-${userId}`;

        // Add a badge for new messages with unread count
        const badge = document.createElement('span');
        badge.classList.add('badges');
        badge.id = `badge-${userId}`;
        //badge.textContent = '0';
        userTab.appendChild(badge);
		userTab.classList.add('active');

        userTab.addEventListener('click', () => {
            setActiveChat(userId);
            const userBadge = document.getElementById(`badge-${userId}`);
            //userBadge.textContent = '0';
            userBadge.classList.add('d-none');
			userTab.classList.remove('active');
        });

        userList.appendChild(userTab);

        if (!activeChatId) {
            setActiveChat(userId);
        }
    }
}

// Function to handle new messages and show the badge
function handleNewMessage(userId) {
    const badge = document.getElementById(`badge-${userId}`);
    if (badge) {
        let unreadCount = parseInt(badge.textContent);
        unreadCount += 1;
        badge.textContent = unreadCount;
        badge.classList.remove('d-none');
    }
}

// Function to set the active chat and display the corresponding messages
function setActiveChat(userId) {
    activeChatId = userId;
    chatArea.innerHTML = '';
    userChats[userId].forEach(message => {
        displayMessage(message.content, message.sender, message.type, false);
    });
}

// Function to append messages to the chat area with alignment
function displayMessage(content, sender = 'bot', type = 'text', store = true) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.style.textAlign = sender === 'bot' ? 'left' : 'right'; // Align based on sender

    if (type === 'text') {
        messageElement.innerHTML = `<p><b>${sender === 'bot' ? 'User' : 'You'}:</b> ${content}</p>`;
    } else if (type === 'image') {
        messageElement.innerHTML = `<p><b>${sender === 'bot' ? 'User' : 'You'}:</b></p><img src="${content}" alt="Image" style="max-width: 20%; height: auto;">`;
    } else if (type === 'video') {
        messageElement.innerHTML = `<p><b>${sender === 'bot' ? 'User' : 'You'}:</b></p><video controls style="max-width: 20%; height: auto;"><source src="${content}" type="video/mp4"></video>`;
    }

    chatArea.appendChild(messageElement);
    chatArea.scrollTop = chatArea.scrollHeight; // Scroll to the bottom

    // Store the message in the correct user's chat only if store is true (to avoid duplicate storage)
	if (store && activeChatId) {
        userChats[activeChatId].push({ content, sender, type });
    }
}

// Event listener for sending text messages
sendBtn.addEventListener('click', function () {
    const message = messageInput.value.trim();
    if (message !== '' && activeChatId) {
        // Display the user's message in the active chat
        displayMessage(message, 'user', 'text');

        // Clear the input field
        messageInput.value = '';

        // Send message to Telegram bot for the active user
        sendMessageToTelegram(activeChatId, message);
    }
});

// Event listeners for uploading images and videos
uploadImageBtn.addEventListener('click', () => {
    fileInput.setAttribute('accept', 'image/*');
    fileInput.click();
});

uploadVideoBtn.addEventListener('click', () => {
    fileInput.setAttribute('accept', 'video/*');
    fileInput.click();
});

fileInput.addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file && activeChatId) {
        const fileType = file.type.startsWith('image') ? 'image' : 'video';
        const fileURL = URL.createObjectURL(file);

        // Display the file in the chat area as user-sent
        displayMessage(fileURL, 'user', fileType);

        // Send the media to the Telegram bot
        if (fileType === 'image') {
            sendPhotoToTelegram(activeChatId, file);
        } else if (fileType === 'video') {
            sendVideoToTelegram(activeChatId, file);
        }
    }
});

// Function to send a text message to the Telegram bot for a specific user
function sendMessageToTelegram(chatId, message) {
    const data = {
        chat_id: chatId,
        text: message
    };

    fetch(`${apiUrl}/sendMessage`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        console.log('Message sent to Telegram:', result);
    })
    .catch(error => {
        console.error('Error sending message to Telegram:', error);
    });
}

// Function to send an image to the Telegram bot
function sendPhotoToTelegram(chatId, file) {
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('photo', file);

    fetch(`${apiUrl}/sendPhoto`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(result => {
        console.log('Photo sent to Telegram:', result);
    })
    .catch(error => {
        console.error('Error sending photo to Telegram:', error);
    });
}

// Function to send a video to the Telegram bot
function sendVideoToTelegram(chatId, file) {
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('video', file);

    fetch(`${apiUrl}/sendVideo`, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(result => {
        console.log('Video sent to Telegram:', result);
    })
    .catch(error => {
        console.error('Error sending video to Telegram:', error);
    });
}

// Function to retrieve new messages using getUpdates method
function getUpdates() {
    fetch(`${apiUrl}/getUpdates?offset=${lastUpdateId + 1}`)
    .then(response => response.json())
    .then(result => {
        const updates = result.result;
        if (updates.length > 0) {
            updates.forEach(update => {
                const message = update.message;
                if (message) {
                    const chatId = message.chat.id;
                    const userId = message.from.id; // Use user's Telegram ID
					const userName = message.from.username; // Use user's Telegram ID

                    // If it's a new user, create a tab for them
                    if (!userChats[userId]) {
                        createUserTab(userId, userName);
                    }

                    // Store and display the message in the correct chat
                    const text = message.text;
                    userChats[userId].push({ content: text, sender: 'bot', type: 'text' });

                    // Update the current active chat if this user is active
                    if (activeChatId === userId) {
                        displayMessage(text, 'bot', 'text', false); // Avoid duplicate storage
                    } else {
                        // Show a blinking badge for new messages if the user is not active
                        document.getElementById(`badge-${userId}`).classList.remove('d-none');
                    }

                    // Optionally send a response back to Telegram
                    //sendMessageToTelegram(chatId, 'Your message was received!');

                    // Update lastUpdateId to the latest one
                    lastUpdateId = update.update_id;
                }
            });
        }
    })
    .catch(error => {
        console.error('Error fetching updates from Telegram:', error);
    });
}

// Periodically check for new messages from Telegram bot
setInterval(getUpdates, 3000);  // Fetch updates every 3 seconds
