// Simple Toast Notification System
class ToastNotification {
    constructor(options = {}) {
        this.options = {
            position: options.position || 'bottom-right',
            duration: options.duration || 3000,
            maxToasts: options.maxToasts || 5,
            ...options
        };
        
        this.toasts = [];
        this.container = this.createContainer();
    }
    
    createContainer() {
        const container = document.createElement('div');
        container.className = `fixed z-50 p-4 flex flex-col gap-3 ${this.getPositionClasses()}`;
        document.body.appendChild(container);
        return container;
    }
    
    getPositionClasses() {
        switch(this.options.position) {
            case 'top-right': return 'top-0 right-0';
            case 'top-left': return 'top-0 left-0';
            case 'bottom-left': return 'bottom-0 left-0';
            case 'bottom-center': return 'bottom-0 left-1/2 transform -translate-x-1/2';
            case 'top-center': return 'top-0 left-1/2 transform -translate-x-1/2';
            default: return 'bottom-0 right-0';
        }
    }
    
    show(message, type = 'info', title = '') {
        // Limit number of toasts
        if (this.toasts.length >= this.options.maxToasts) {
            const oldestToast = this.toasts.shift();
            oldestToast.element.remove();
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `max-w-xs rounded-lg shadow-lg p-4 transform transition-all duration-300 ease-in-out ${this.getTypeClasses(type)}`;
        
        // Add content
        let content = '';
        if (title) {
            content += `<h4 class="font-bold text-sm mb-1">${title}</h4>`;
        }
        content += `<p class="text-sm">${message}</p>`;
        toast.innerHTML = content;
        
        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'absolute top-1 right-1 text-white opacity-70 hover:opacity-100';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => this.close(toast));
        toast.appendChild(closeBtn);
        
        // Add to container
        this.container.appendChild(toast);
        
        // Store reference
        const toastObj = { element: toast, timeout: null };
        this.toasts.push(toastObj);
        
        // Set timeout for auto-close
        toastObj.timeout = setTimeout(() => {
            this.close(toast);
        }, this.options.duration);
        
        return toast;
    }
    
    close(toastElement) {
        // Find toast in array
        const index = this.toasts.findIndex(t => t.element === toastElement);
        if (index !== -1) {
            const toast = this.toasts[index];
            
            // Clear timeout
            if (toast.timeout) {
                clearTimeout(toast.timeout);
            }
            
            // Add exit animation
            toast.element.classList.add('opacity-0', 'translate-x-full');
            
            // Remove after animation
            setTimeout(() => {
                toast.element.remove();
                this.toasts.splice(index, 1);
            }, 300);
        }
    }
    
    getTypeClasses(type) {
        switch(type) {
            case 'success': return 'bg-green-600 text-white';
            case 'error': return 'bg-red-600 text-white';
            case 'warning': return 'bg-yellow-500 text-white';
            default: return 'bg-blue-600 text-white';
        }
    }
    
    success(message, title = '') {
        return this.show(message, 'success', title);
    }
    
    error(message, title = '') {
        return this.show(message, 'error', title);
    }
    
    warning(message, title = '') {
        return this.show(message, 'warning', title);
    }
    
    info(message, title = '') {
        return this.show(message, 'info', title);
    }
}

// Create global instance
window.toast = new ToastNotification(); 