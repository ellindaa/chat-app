class ChatApplication {
    constructor() {
        this.currentUser = { 
            id: 'user1', 
            username: 'You'
        };
        this.conversations = [];
        this.currentConversation = null;
        this.init();
    }

    async init() {
        this.showLoading();
        await this.loadConversations();
        this.setupEventListeners();
        this.renderConversations();
        this.hideLoading();
    }

    async loadConversations() {
        try {
            console.log('Loading conversations from conversations.json...');
            const response = await fetch('./conversations.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            this.conversations = data.conversations || [];
            console.log('Successfully loaded conversations:', this.conversations.length);
        } catch (error) {
            console.error('Error loading conversations:', error);
            this.conversations = this.getFallbackData();
        }
    }

    getFallbackData() {
        console.log('Using fallback data');
        return [
            {
                id: 'conv-fallback',
                name: 'Demo Chat',
                type: 'group',
                last_message: 'Welcome to the demo!',
                last_message_time: new Date().toISOString(),
                messages: [
                    {
                        id: 'msg-1',
                        user_id: 'user2',
                        username: 'Bot',
                        content: 'Welcome to the chat application! 🎉',
                        message_type: 'text',
                        timestamp: new Date().toISOString()
                    }
                ]
            }
        ];
    }

    setupEventListeners() {
        // Send message functionality
        document.getElementById('sendBtn').addEventListener('click', () => this.sendMessage());
        
        document.getElementById('messageInput').addEventListener('input', (e) => {
            const sendBtn = document.getElementById('sendBtn');
            sendBtn.disabled = e.target.value.trim() === '';
        });

        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // File attachment
        document.getElementById('attachBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileUpload(e));

        // Modal functionality
        document.querySelector('.close').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('imageModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeModal();
            }
        });

        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterConversations(e.target.value);
        });

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    renderConversations() {
        const container = document.getElementById('conversationsList');
        container.innerHTML = '';

        if (this.conversations.length === 0) {
            container.innerHTML = `
                <div class="no-conversations">
                    <i class="fas fa-inbox fa-2x"></i>
                    <p>No conversations yet</p>
                </div>
            `;
            return;
        }

        this.conversations.forEach(conversation => {
            const conversationElement = this.createConversationElement(conversation);
            container.appendChild(conversationElement);
        });
    }

    createConversationElement(conversation) {
        const div = document.createElement('div');
        div.className = 'conversation-item';
        div.setAttribute('data-conversation-id', conversation.id);

        const lastMessage = conversation.last_message || 'No messages yet';
        const lastTime = conversation.last_message_time || new Date().toISOString();

        div.innerHTML = `
            <div class="conversation-avatar">${conversation.avatar || conversation.name.charAt(0)}</div>
            <div class="conversation-info">
                <div class="conversation-name">${conversation.name}</div>
                <div class="conversation-last-message">${lastMessage}</div>
            </div>
            <div class="conversation-time">${this.formatTime(lastTime)}</div>
        `;

        div.addEventListener('click', () => this.selectConversation(conversation));

        return div;
    }

    selectConversation(conversation) {
        // Remove active class from all conversations
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to selected conversation
        const selectedElement = document.querySelector(`[data-conversation-id="${conversation.id}"]`);
        if (selectedElement) {
            selectedElement.classList.add('active');
        }

        this.currentConversation = conversation;
        
        // Update chat header
        document.getElementById('currentChatName').textContent = conversation.name;
        document.getElementById('currentChatAvatar').textContent = conversation.avatar || conversation.name.charAt(0);
        document.getElementById('chatStatus').textContent = this.getConversationStatus(conversation);
        
        // Enable message input
        document.getElementById('messageInput').disabled = false;
        document.getElementById('sendBtn').disabled = true;

        // Render messages
        this.renderMessages(conversation.messages || []);

        // Hide welcome message
        document.getElementById('welcomeMessage').style.display = 'none';
    }

    getConversationStatus(conversation) {
        if (conversation.type === 'private') {
            return 'Online';
        } else {
            const participantCount = conversation.participants?.length || 1;
            return `${participantCount} participants`;
        }
    }

    renderMessages(messages) {
        const container = document.getElementById('messagesContainer');
        container.innerHTML = '';

        if (messages.length === 0) {
            container.innerHTML = `
                <div class="welcome-message">
                    <i class="fas fa-comments fa-3x"></i>
                    <h3>No messages yet</h3>
                    <p>Start the conversation by sending a message!</p>
                </div>
            `;
            return;
        }

        messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            container.appendChild(messageElement);
        });

        this.scrollToBottom();
    }

    createMessageElement(message) {
        const isOwnMessage = message.user_id === this.currentUser.id;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isOwnMessage ? 'own' : 'other'}`;

        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';

        // Add sender name for group chats (except own messages)
        if (!isOwnMessage && this.currentConversation?.type === 'group') {
            const senderDiv = document.createElement('div');
            senderDiv.className = 'message-sender';
            senderDiv.textContent = message.username;
            bubbleDiv.appendChild(senderDiv);
        }

        // Message content based on type
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        switch (message.message_type) {
            case 'text':
                contentDiv.textContent = message.content;
                break;
            case 'image':
                contentDiv.appendChild(this.createImageMessage(message));
                break;
            case 'video':
                contentDiv.appendChild(this.createVideoMessage(message));
                break;
            case 'pdf':
                contentDiv.appendChild(this.createPDFMessage(message));
                break;
            default:
                contentDiv.textContent = message.content;
        }

        bubbleDiv.appendChild(contentDiv);

        // Message timestamp
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.textContent = this.formatTime(message.timestamp);
        bubbleDiv.appendChild(timeDiv);

        messageDiv.appendChild(bubbleDiv);
        return messageDiv;
    }

    createImageMessage(message) {
        const container = document.createElement('div');
        container.className = 'media-message';

        const mediaContainer = document.createElement('div');
        mediaContainer.className = 'media-container';

        const img = document.createElement('img');
        img.src = message.file_data?.url || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400';
        img.alt = message.file_data?.file_name || 'Image';
        img.className = 'media-image';
        img.loading = 'lazy';

        img.addEventListener('click', () => this.showImageModal(
            message.file_data?.url || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800',
            message.content
        ));

        mediaContainer.appendChild(img);
        container.appendChild(mediaContainer);

        // Add caption if exists and is not the default text
        if (message.content && !message.content.includes('Shared an image')) {
            const caption = document.createElement('div');
            caption.style.marginTop = '8px';
            caption.style.fontSize = '14px';
            caption.style.color = 'inherit';
            caption.textContent = message.content;
            container.appendChild(caption);
        }

        return container;
    }

    createVideoMessage(message) {
        const container = document.createElement('div');
        container.className = 'media-message';

        const mediaContainer = document.createElement('div');
        mediaContainer.className = 'media-container';

        const video = document.createElement('video');
        video.src = message.file_data?.url || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
        video.controls = true;
        video.className = 'media-video';
        video.preload = 'metadata';

        mediaContainer.appendChild(video);
        container.appendChild(mediaContainer);

        // Add caption if exists and is not the default text
        if (message.content && !message.content.includes('Shared a video')) {
            const caption = document.createElement('div');
            caption.style.marginTop = '8px';
            caption.style.fontSize = '14px';
            caption.style.color = 'inherit';
            caption.textContent = message.content;
            container.appendChild(caption);
        }

        return container;
    }

    createPDFMessage(message) {
        const container = document.createElement('div');
        container.className = 'media-message';

        const pdfPreview = document.createElement('div');
        pdfPreview.className = 'pdf-preview';
        pdfPreview.addEventListener('click', () => {
            window.open(message.file_data?.url || '#', '_blank');
        });

        const fileData = message.file_data || {
            file_name: 'document.pdf',
            file_size: 2048576,
            url: '#'
        };

        pdfPreview.innerHTML = `
            <i class="fas fa-file-pdf pdf-icon"></i>
            <div class="pdf-info">
                <div class="pdf-name">${fileData.file_name}</div>
                <div class="pdf-size">${this.formatFileSize(fileData.file_size)}</div>
            </div>
            <a href="${fileData.url}" download="${fileData.file_name}" class="download-btn">
                <i class="fas fa-download"></i>
            </a>
        `;

        container.appendChild(pdfPreview);

        // Add caption if exists and is not the default text
        if (message.content && !message.content.includes('Shared a PDF')) {
            const caption = document.createElement('div');
            caption.style.marginTop = '8px';
            caption.style.fontSize = '14px';
            caption.style.color = 'inherit';
            caption.textContent = message.content;
            container.appendChild(caption);
        }

        return container;
    }

    showImageModal(imageUrl, caption = '') {
        const modal = document.getElementById('imageModal');
        const modalImg = document.getElementById('modalImage');
        const modalCaption = document.getElementById('modalCaption');
        
        modalImg.src = imageUrl;
        modalCaption.textContent = caption;
        modal.style.display = 'block';
    }

    closeModal() {
        const modal = document.getElementById('imageModal');
        modal.style.display = 'none';
    }

    sendMessage() {
        const input = document.getElementById('messageInput');
        const content = input.value.trim();
        
        if (!content || !this.currentConversation) return;

        const message = {
            id: 'msg-' + Date.now(),
            user_id: this.currentUser.id,
            username: this.currentUser.username,
            content: content,
            message_type: 'text',
            timestamp: new Date().toISOString()
        };

        this.addMessageToCurrentConversation(message);
        input.value = '';
        document.getElementById('sendBtn').disabled = true;
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const messageType = this.getFileType(file.type);
        const fileUrl = URL.createObjectURL(file);

        const message = {
            id: 'msg-' + Date.now(),
            user_id: this.currentUser.id,
            username: this.currentUser.username,
            content: `Shared a ${messageType}`,
            message_type: messageType,
            timestamp: new Date().toISOString(),
            file_data: {
                url: fileUrl,
                file_name: file.name,
                file_size: file.size,
                mime_type: file.type
            }
        };

        this.addMessageToCurrentConversation(message);
        event.target.value = '';
    }

    getFileType(mimeType) {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType === 'application/pdf') return 'pdf';
        return 'file';
    }

    addMessageToCurrentConversation(message) {
        if (!this.currentConversation.messages) {
            this.currentConversation.messages = [];
        }
        this.currentConversation.messages.push(message);
        this.renderMessages(this.currentConversation.messages);
    }

    filterConversations(searchTerm) {
        const conversations = document.querySelectorAll('.conversation-item');
        const term = searchTerm.toLowerCase();

        conversations.forEach(conv => {
            const name = conv.querySelector('.conversation-name').textContent.toLowerCase();
            const lastMessage = conv.querySelector('.conversation-last-message').textContent.toLowerCase();
            
            if (name.includes(term) || lastMessage.includes(term)) {
                conv.style.display = 'flex';
            } else {
                conv.style.display = 'none';
            }
        });
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInMs = now - date;
        const diffInHours = diffInMs / (1000 * 60 * 60);

        if (diffInHours < 24) {
            return date.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } else if (diffInHours < 168) {
            return date.toLocaleDateString('en-US', { 
                weekday: 'short' 
            });
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    scrollToBottom() {
        const container = document.getElementById('messagesContainer');
        container.scrollTop = container.scrollHeight;
    }

    showLoading() {
        document.getElementById('loadingSpinner').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loadingSpinner').style.display = 'none';
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ChatApplication();
});