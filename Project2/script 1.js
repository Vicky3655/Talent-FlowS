document.addEventListener("DOMContentLoaded", () => {
    const auth = window.TalentFlowAuth;

    if (auth) {
        auth.initGoogleSignIn();
    }

    setupPasswordToggles();

    // 1. Splash Screen Transition (page.html)
    if (document.getElementById("loader")) {
        setTimeout(() => {
            window.location.href = "login.html";
        }, 2000);
    }

    // 2. Handling the "Create Account" button (register.html)
    const createAccountBtn = document.querySelector(".sign");
    if (createAccountBtn) {
        createAccountBtn.addEventListener("click", (e) => {
            e.preventDefault(); // Prevents form refresh for demo purposes

            // Get form values
            const name = document.getElementById("Name").value;
            const email = document.getElementById("Email").value;
            const password = document.getElementById("password").value;
            const roleSelect = document.getElementById("role-select");
            const role = roleSelect.value;

            // Basic validation
            if (!name || !email || !password || !role) {
                alert("Please fill in all fields");
                return;
            }

            // Store user profile in localStorage
            const saved = auth?.saveUserProfile({
                id: Date.now().toString(),
                name: name,
                email: email,
                role: role,
                avatar: "",
                provider: "email",
                username: email.split("@")[0],
            });

            // Send them to fill in their role-specific profile details
            if (auth?.redirectToRoleProfile) {
                auth.redirectToRoleProfile(saved?.role || role);
            } else {
                window.location.href = "courses.html";
            }
        });
    }

    // 3. Handling the "Login" button (login.html)
    const loginBtn = document.querySelector(".log");
    if (loginBtn) {
        loginBtn.addEventListener("click", (e) => {
            e.preventDefault();

            const email = document.getElementById("Email").value.trim();
            const password = document.getElementById("password").value.trim();

            if (!email || !password) {
                alert("Please enter your email and password");
                return;
            }

            const saved = auth?.saveUserProfile({
                name: email.split("@")[0] || "Talent Flow User",
                email: email,
                provider: "email",
                username: email.split("@")[0],
            });

            if (auth?.redirectToRoleProfile) {
                auth.redirectToRoleProfile(saved?.role);
            } else {
                window.location.href = "courses.html";
            }
        });
    }

    // 4. Path Selection Logic (courses.html)
    const pathButtons = document.querySelectorAll(".select-btn");
    pathButtons.forEach(button => {
        button.addEventListener("click", () => {
            // Here you can link to specific course pages in the future
            alert("Path Selected: " + button.innerText);
            // window.location.href = "course-details.html"; 
        });
    });
});

// 5. Password show/hide toggle (login.html + register.html)
function setupPasswordToggles() {
    document.querySelectorAll(".toggle-password").forEach((btn) => {
        btn.addEventListener("click", () => {
            const input = document.getElementById(btn.dataset.target);
            if (!input) return;

            const willShow = input.type === "password";
            input.type = willShow ? "text" : "password";
            btn.classList.toggle("is-visible", willShow);
            btn.setAttribute("aria-label", willShow ? "Hide password" : "Show password");
        });
    });
}
