
export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');

    // Create Toast Element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    // Icon based on type
    let icon = 'bx-info-circle';
    if (type === 'success') icon = 'bx-check-circle';
    if (type === 'error') icon = 'bx-error-circle';

    toast.innerHTML = `
        <i class='bx ${icon}'></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Animation: Enter
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Remove after 4 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300); // Wait for exit animation
    }, 4000);
}
