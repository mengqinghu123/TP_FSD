document.addEventListener("DOMContentLoaded", function() {
    // Chat Session Management
    const historyList = document.getElementById("history-list");
    const newSessionButton = document.getElementById("new-session-button");
    const messageInput = document.getElementById("message-input");
    const messages = document.getElementById("messages");

    const registerForm = document.getElementById("registerForm");
    const registerError = document.getElementById("registerError");

    function validateEmail(email) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailPattern.test(email);
    }

    function validatePassword(password) {
        const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        return passwordPattern.test(password);
    }

    window.validateForm = function() {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (!validateEmail(email)) {
            registerError.textContent = "Invalid email format.";
            return false;
        }

        if (!validatePassword(password)) {
            registerError.textContent = "Password must contain at least 8 characters, including uppercase, lowercase, number, and special character.";
            return false;
        }

        if (password !== confirmPassword) {
            registerError.textContent = "Passwords do not match.";
            return false;
        }

        return true;
    };

    window.register = function(event) {
        event.preventDefault();
        const FirstName = document.getElementById("FirstName").value;
        const LastName = document.getElementById("LastName").value;
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        if (password !== confirmPassword) {
            registerError.textContent = "Passwords do not match. Please try again.";
            return;
        }

        fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ FirstName, LastName, email, password }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.href = 'login.html';
            } else {
                registerError.textContent = "Registration failed. Please try again.";
            }
        })
        .catch(error => {
            registerError.textContent = "An error occurred. Please try again.";
            console.error("Error during registration:", error);
        });
    };

    let currentSessionId = null;

    if (newSessionButton) {
        newSessionButton.addEventListener("click", startNewSession);
    }

    function startNewSession() {
        fetch('/start_new_session/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
        })
        .then(response => response.json())
        .then(data => {
            currentSessionId = data.id;
            loadChatSessions();
        })
        .catch(error => console.error("Error starting new session:", error));
    }

    window.sendMessage = function() {
        const message = messageInput.value.trim();
        if (!message) return;

        if (!currentSessionId) {
            alert("Please start a new session or select an existing session.");
            return;
        }

        // Display and save user message
        displayMessage(message, "user");
        saveMessage(message, "user");

        // Clear input box
        messageInput.value = "";

        // Simulate bot response
        setTimeout(() => {
            const botResponse = "This is a bot response.";
            displayMessage(botResponse, "bot");
            saveMessage(botResponse, "bot");
        }, 500);
    }

    function displayMessage(message, senderType) {
        const messageDiv = document.createElement("div");
        messageDiv.classList.add("message", senderType);
        messageDiv.textContent = message;
        messages.appendChild(messageDiv);
        messages.scrollTop = messages.scrollHeight;
    }

    if (messageInput) {
        messageInput.addEventListener("keydown", function(event) {
            if (event.key === "Enter") {
                sendMessage();
            }
        });
    }

    function loadChatSessions() {
        fetch('/load_chat_sessions/', {
            headers: {
                'Authorization': 'Token ' + localStorage.getItem('token')
            }
        })
        .then(response => response.json())
        .then(data => {
            historyList.innerHTML = '';
            data.forEach(session => {
                const historyItem = document.createElement("li");
                historyItem.classList.add('history-item');
                historyItem.dataset.sessionId = session.id;

                const titleSpan = document.createElement("span");
                titleSpan.textContent = session.session_title;
                titleSpan.classList.add("session-title");

                const renameInput = document.createElement("input");
                renameInput.classList.add("rename-input");
                renameInput.value = session.session_title;
                renameInput.addEventListener("keydown", function(event) {
                    if (event.key === "Enter") {
                        renameSession(session.id, renameInput.value);
                        titleSpan.textContent = renameInput.value;
                        renameInput.style.display = "none";
                        titleSpan.style.display = "block";
                    }
                });

                const optionsButton = document.createElement("div");
                optionsButton.classList.add("options");
                optionsButton.textContent = "⋮";
                optionsButton.addEventListener("click", function(event) {
                    event.stopPropagation();
                    toggleOptionsMenu(session.id);
                });

                const optionsMenu = document.createElement("div");
                optionsMenu.classList.add("options-menu");
                optionsMenu.innerHTML = `
                    <a href="#" onclick="showRenameInput(${session.id})">Rename</a>
                    <a href="#" onclick="deleteSession(${session.id})">Delete</a>
                `;

                historyItem.appendChild(titleSpan);
                historyItem.appendChild(renameInput);
                historyItem.appendChild(optionsButton);
                historyItem.appendChild(optionsMenu);

                historyItem.addEventListener("click", () => {
                    currentSessionId = session.id;
                    loadChatHistory();
                });

                historyList.appendChild(historyItem);
            });
        })
        .catch(error => console.error("Error loading chat sessions:", error));
    }

    function loadChatHistory() {
        fetch(`/load_chat_history/${currentSessionId}/`, {
            headers: {
                'Authorization': 'Token ' + localStorage.getItem('token')
            }
        })
        .then(response => response.json())
        .then(data => {
            messages.innerHTML = '';
            data.messages.forEach(item => {
                displayMessage(item.content, item.sender_type);
            });
            messages.scrollTop = messages.scrollHeight;
        })
        .catch(error => console.error("Error loading chat history:", error));
    }

    function saveMessage(content, senderType) {
        console.log("Saving message:", content, "from sender:", senderType);
        fetch('/send_message/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ session_id: currentSessionId, content: content, sender_type: senderType })
        })
        .then(response => response.json())
        .then(data => {
            console.log("Message saved:", data);
        })
        .catch(error => console.error("Error saving message:", error));
    }

    window.renameSession = function(sessionId, newTitle) {
        fetch('/update_session_title/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ session_id: sessionId, title: newTitle })
        })
        .then(() => {
            alert("Session renamed successfully");
            loadChatSessions();
        })
        .catch(error => console.error("Error renaming session:", error));
    }

    window.deleteSession = function(sessionId) {
        fetch(`/delete_session/${sessionId}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        })
        .then(() => {
            alert("Session deleted successfully");
            loadChatSessions();
        })
        .catch(error => console.error("Error deleting session:", error));
    }

    window.toggleOptionsMenu = function(sessionId) {
        document.querySelectorAll('.options-menu').forEach(menu => {
            if (menu.parentElement.dataset.sessionId == sessionId) {
                menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
            } else {
                menu.style.display = 'none';
            }
        });
    }

    window.showRenameInput = function(sessionId) {
        const historyItem = document.querySelector(`.history-item[data-session-id="${sessionId}"]`);
        historyItem.querySelector('.session-title').style.display = 'none';
        historyItem.querySelector('.rename-input').style.display = 'block';
        historyItem.querySelector('.rename-input').focus();
    }

    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    loadChatSessions();

    window.logout = function() {
        localStorage.removeItem('token');
        window.location.href = '/login/';
    };

    // Document Management: Search, View, Download, Delete
    const searchInput = document.getElementById("searchInput");
    const tableRows = document.querySelectorAll("#fileTable tbody tr");

    if (searchInput) {
        searchInput.addEventListener("keyup", function() {
            const filter = searchInput.value.toLowerCase();
            tableRows.forEach(row => {
                const name = row.querySelector("td:nth-child(2)").textContent.toLowerCase();
                if (name.includes(filter)) {
                    row.style.display = "";
                } else {
                    row.style.display = "none";
                }
            });
        });
    }


document.addEventListener("DOMContentLoaded", function() {

    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const fileId = this.closest('tr').dataset.fileId;
            window.open(`/view/${fileId}`, '_blank');
        });
    });

    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const fileId = this.closest('tr').dataset.fileId;
            window.location.href = `/download/${fileId}`;
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const fileId = this.closest('tr').dataset.fileId;
            if (confirm(`Are you sure you want to delete this file?`)) {
                fetch(`/delete/${fileId}/`, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': getCookie('csrftoken')
                    }
                }).then(() => {
                    window.location.reload();
                });
            }
        });
    });

    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
});




});
