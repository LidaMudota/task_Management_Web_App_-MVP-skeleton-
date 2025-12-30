export const initNavigation = ({
  onShowTasks,
  onShowAccount,
  onLogout,
} = {}) => {
  const menuToggle = document.querySelector("#user-menu-toggle");
  const menuList = document.querySelector("#user-menu");
  const signOutBtn = document.querySelector("#sign-out-btn");

  const closeMenu = () => {
    if (menuList) menuList.classList.remove("user-menu__list--open");
    if (menuToggle) menuToggle.classList.remove("user-menu__toggle--open");
  };

  if (menuToggle && menuList) {
    menuToggle.addEventListener("click", () => {
      menuList.classList.toggle("user-menu__list--open");
      menuToggle.classList.toggle("user-menu__toggle--open");
    });
  }

  if (menuList) {
    menuList.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        closeMenu();
        switch (action) {
          case "account":
            onShowAccount && onShowAccount();
            break;
          case "tasks":
            onShowTasks && onShowTasks();
            break;
          case "logout":
            onLogout && onLogout();
            break;
          default:
            break;
        }
      });
    });
  }

  if (signOutBtn) {
    signOutBtn.addEventListener("click", () => {
      closeMenu();
      onLogout && onLogout();
    });
  }
};
