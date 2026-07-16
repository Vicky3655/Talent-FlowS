document.addEventListener("DOMContentLoaded", () => {
    // 1. Splash Screen Transition (page.html)
    if (document.getElementById("loader")) {
        setTimeout(() => {
            window.location.href = "login.html";
        }, 2000);
    }

    // 2. Handling the "Create Account" button (dashboard.html)
    const createAccountBtn = document.querySelector(".sign");
    if (createAccountBtn) {
        createAccountBtn.addEventListener("click", (e) => {
            e.preventDefault(); // Prevents form refresh for demo purposes
            window.location.href = "student-dashboard.html";
        });
    }

    // 3. Handling the "Login" button (login.html)
    const loginBtn = document.querySelector(".log");
    if (loginBtn && document.title === "Talent Flow") { // Checks if on Login page
        loginBtn.addEventListener("click", (e) => {
            e.preventDefault();
            window.location.href = "student-dashboard.html";
        });
    }

});