
// ── PayPal Payment Logic ──

const PAYPAL_ME_URL = "https://www.paypal.com/paypalme/dasaryan715";

function handlePayment(planName, monthlyRate, isAnnual) {
    // Calculate total amount
    const multiplier = isAnnual ? 12 : 1;
    let totalAmount = monthlyRate * multiplier;

    // Construct PayPal URL: paypal.me/User/AmountCurrency
    // Example: paypal.me/dasaryan715/299INR
    const url = `${PAYPAL_ME_URL}/${totalAmount}INR`;

    console.log(`Redirecting to: ${url}`);
    window.location.href = url;
}

document.addEventListener('DOMContentLoaded', () => {
    // Find Plan Buttons
    const buttons = document.querySelectorAll('.btn-select');
    const billingToggle = document.getElementById('billing-toggle');

    buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const text = btn.innerText.toLowerCase();
            const isAnnual = billingToggle.checked;

            if (text.includes('go')) {
                // Go Plan
                // Monthly: 299, Annual: 249/mo
                e.preventDefault();
                const rate = isAnnual ? 249 : 299;
                handlePayment('Go', rate, isAnnual);
            }
            else if (text.includes('full') || text.includes('pro')) {
                // Pro Plan
                // Monthly: 599, Annual: 499/mo
                e.preventDefault();
                const rate = isAnnual ? 499 : 599;
                handlePayment('Pro', rate, isAnnual);
            }
            // Basic plan (text includes 'current' or redirects to getstarted) - do nothing
        });
    });
});
