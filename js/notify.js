document.addEventListener('DOMContentLoaded', () => {

    const modal = document.getElementById('notifyModal');
    const closeBtn = document.getElementById('notifyClose');
    const form = document.getElementById('notifyForm');
    const successBox = document.getElementById('notifySuccess');
    const serviceText = document.getElementById('notifyServiceText');

    let selectedService = '';

    // Open modal
    document.querySelectorAll('.notify-btn').forEach(button => {

        button.addEventListener('click', (e) => {

    e.preventDefault();
    e.stopPropagation();


            selectedService = button.dataset.service || '';

            serviceText.textContent =
                `Interested in: ${selectedService}`;

            modal.classList.add('active');

            successBox.style.display = 'none';
            form.style.display = 'flex';
            form.reset();

        });

    });

    // Close modal
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    // Close when clicking background
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    // Submit form
    form.addEventListener('submit', async (e) => {

        e.preventDefault();

        // Fallback: if SHEETS_URL is not configured, alert and stop
        if (SHEETS_URL.includes('YOUR_SCRIPT_ID')) {
            alert('This service is temporarily unavailable. Please call us on +92 300 0041510.');
            return;
        }

        const payload = {
            formType: 'notify',
            service: selectedService,
            name: document.getElementById('notifyName').value.trim(),
            phone: document.getElementById('notifyPhone').value.trim(),
            email: document.getElementById('notifyEmail').value.trim()
        };

        try {

            await fetch(SHEETS_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            form.style.display = 'none';
            successBox.style.display = 'block';

        } catch (error) {

            alert(
                'Something went wrong. Please try again.'
            );

            console.error(error);

        }

    });

});