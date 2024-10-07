// Define your bot token (replace with your actual bot token)
const BOT_TOKEN = '7870041164:AAHka4CS6Jwyt61-39vMvVRhE-bEj7-77c0';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${BOT_TOKEN}/`;
let lastUpdateId = 0;
let userChatId = null; // This will store the chatId dynamically

// Function to log events
function logEvent(message) {
    const logArea = document.getElementById('chatLog');
    logArea.value += message + '\n';
    logArea.scrollTop = logArea.scrollHeight;  // Scroll to bottom
}

// Send a message using the bot
function sendMessage(chatId, message) {
    logEvent(`Sending message: "${message}" to chatId: ${chatId}`);
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
            logEvent(`Message sent successfully!`);
        } else {
            logEvent(`Error sending message: ${data.description}`);
        }
    })
    .catch(error => logEvent(`Fetch error: ${error}`));
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

                    // Check if this update contains a message
                    if (update.message) {
                        const chatId = update.message.chat.id;
                        const messageText = update.message.text;
                        const userId = update.message.from.id;

                        // Dynamically assign chatId for the user
                        userChatId = chatId;

                        logEvent(`Received message: "${messageText}" from User ID: ${userId} (chatId: ${chatId})`);

                        // Optionally, you can respond automatically to messages here:
                        // sendMessage(chatId, "Thanks for your message!");
                    }
                });
            } else {
                logEvent(`Error fetching updates: ${data.description}`);
            }
        })
        .catch(error => logEvent(`Fetch error: ${error}`));
}

// Setup a listener for the send button
document.getElementById('sendBtn').addEventListener('click', () => {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value;

    if (message.trim() === '') {
        logEvent('Message is empty, cannot send.');
        return;
    }

    if (userChatId) {
        // Use the dynamically assigned chatId from the updates
        sendMessage(userChatId, message);
        messageInput.value = '';  // Clear the input field
    } else {
        logEvent('No user chatId available. Please wait for the user to send a message.');
    }
});

// Poll the Telegram server every 3 seconds for updates
setInterval(getUpdates, 3000);
