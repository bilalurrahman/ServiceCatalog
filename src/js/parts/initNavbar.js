import { $, throttleScroll, debounceResize, bodyOverflow, $wnd, wndW } from './_utility';

/*------------------------------------------------------------------

  Init Navbar

-------------------------------------------------------------------*/
function initNavbar() {
    const self = this;
    const $navbar = $('.dx-navbar-top');

    // Fixed open modal
    let navbarWidth = 0;

    debounceResize(() => {
        navbarWidth = $navbar.innerWidth();
    });
    $(document).on('beforeLoad.fb', () => {
        $navbar.width(navbarWidth);
    });
    $(document).on('afterClose.fb', () => {
        $navbar.width('');
    });

    // Sticky
    const navbarTop = $navbar.length ? $navbar.offset().top : 0;
    // fake hidden navbar to prevent page jumping on stick
    const $navbarFake = $('<div>').hide();
    function onScrollNav() {
        const stickyOn = $wnd.scrollTop() >= navbarTop;

        if (stickyOn) {
            $navbar.addClass('dx-navbar-fixed');
            $navbarFake.show();
        } else {
            $navbar.removeClass('dx-navbar-fixed');
            $navbarFake.hide();
        }
    }
    if ($navbar.hasClass('dx-navbar-sticky')) {
        $wnd.on('scroll resize', onScrollNav);
        onScrollNav();

        $navbar.after($navbarFake);
        $navbarFake.height($navbar.innerHeight());

        self.debounceResize(() => {
            $navbarFake.height($navbar.innerHeight());
        });
    }

    // hide / show
    // add / remove solid color
    const $autohideNav = $navbar.filter('.dx-navbar-autohide');
    self.throttleScroll((type, scroll) => {
        const start = 400;
        const hideClass = 'dx-onscroll-hide';
        const showClass = 'dx-onscroll-show';

        // hide / show
        if (type === 'down' && scroll > start) {
            $autohideNav.removeClass(showClass).addClass(hideClass);
        } else if (type === 'up' || type === 'end' || type === 'start') {
            $autohideNav.removeClass(hideClass).addClass(showClass);
        }
    });

    // Scroll
    if ($navbar.hasClass('dx-navbar-fixed') || $navbar.hasClass('dx-navbar-sticky')) {
        throttleScroll((type, scroll) => {
            if (scroll > 200) {
                $navbar.addClass('dx-navbar-scroll');
            } else {
                $navbar.removeClass('dx-navbar-scroll');
            }
        });
    }

    // Dropdown
    $navbar.find('.dx-navbar-dropdown').each(function () {
        const $thisDropdown = $(this);

        // Dropdown Position
        debounceResize(() => {
            const dropdownLeft = $thisDropdown.offset().left;
            const dropdownRight = wndW - (dropdownLeft + $thisDropdown.innerWidth());
            const dropdownItem = $thisDropdown.closest('.dx-drop-item');

            const dropdownDrop = $thisDropdown.find('.dx-navbar-dropdown');

            if (!dropdownDrop.length) {
                return;
            }

            const dropdownDropWidth = dropdownDrop.innerWidth();
            const dropdownDropLeft = dropdownDrop.offset().left;
            const dropdownDropRight = wndW - (dropdownDropLeft + dropdownDropWidth);
            const dropdownDropItem = dropdownDrop.closest('.dx-drop-item');

            if (dropdownRight < 0) {
                $thisDropdown.css({ right: 0, left: 'auto' }).addClass('dx-navbar-dropdown-left');
                dropdownItem.addClass('dx-drop-item-left');
            }
            if (dropdownLeft < dropdownRight) {
                $thisDropdown.removeAttr('style').removeClass('dx-navbar-dropdown-left');
                dropdownItem.removeClass('dx-drop-item-left');
            }
            if (dropdownDropRight < 0 && dropdownDropLeft >= dropdownDropWidth) {
                dropdownDrop.removeAttr('style').addClass('dx-navbar-dropdown-left');
                dropdownDropItem.addClass('dx-drop-item-left');
            } else {
                dropdownDrop.removeAttr('style').removeClass('dx-navbar-dropdown-left').addClass('dx-navbar-dropdown-bot');
                dropdownDropItem.removeClass('dx-drop-item-left').addClass('dx-drop-item-bot');
            }
            if (dropdownDropLeft < 0 && dropdownDropRight >= dropdownDropWidth) {
                dropdownDrop.removeAttr('style').removeClass('dx-navbar-dropdown-left');
                dropdownDropItem.removeClass('dx-drop-item-left');
            } else {
                dropdownDrop.removeAttr('style').removeClass('dx-navbar-dropdown-left').addClass('dx-navbar-dropdown-bot');
                dropdownDropItem.removeClass('dx-drop-item-left').addClass('dx-drop-item-bot');
            }
            if (dropdownDropRight >= dropdownDropWidth) {
                dropdownDrop.removeAttr('style').removeClass('dx-navbar-dropdown-bot');
                dropdownDropItem.removeClass('dx-drop-item-bot');
            }
        });

        // Dropdown Triangle
        if ($navbar.hasClass('dx-navbar-dropdown-triangle')) {
            $thisDropdown.append('<span class="dx-navbar-dropdown-triangle"></span>');

            $navbar.find('.dx-drop-item > .dx-navbar-dropdown:first > .dx-navbar-dropdown-triangle:first').each(function () {
                const $thisTriangle = $(this);
                const dropLink = $thisTriangle.closest('.dx-drop-item').find('> a');

                debounceResize(() => {
                    $thisTriangle.offset({ left: dropLink.offset().left });
                });
            });
        }
    });

    // Fullscreen Navbar
    const $navbarFull = $('.dx-navbar-fullscreen');
    if ($navbarFull.length) {
        const burger = $navbar.find('.dx-navbar-burger');
        const burgerFull = $navbarFull.find('.dx-navbar-burger');
        const dropItem = $navbarFull.find('.dx-drop-item');

        // Position Burger (navbar-fullscreen)
        debounceResize(() => {
            burgerFull.css({ position: 'absolute', top: burger.offset().top - $navbar.offset().top, left: burger.offset().left });
        });

        // Click on burger navbar
        burger.on('click', () => {
            burger.add(burgerFull).addClass('active');
            $navbarFull.addClass('dx-navbar-fullscreen-open');
            $navbarFull.removeClass('dx-navbar-fullscreen-closed');
            $navbarFull.css({ 'z-index': 1000 });
            bodyOverflow(1);
        });

        // Click on burger navbar-fullscreen
        burgerFull.on('click', () => {
            burger.add(burgerFull).removeClass('active');
            $navbarFull.removeClass('dx-navbar-fullscreen-open');
            $navbarFull.addClass('dx-navbar-fullscreen-closed');
            $navbarFull.find('.show').removeClass('show').innerHeight('');
            $navbarFull.one('transitionend webkitTransitionEnd oTransitionEnd', () => {
                $navbarFull.css({ 'z-index': -1000 });
            });
            bodyOverflow(0);
        });

        // Click on Esc
        $(document).on('keydown', (e) => {
            if (e.keyCode === 27 && $navbarFull.hasClass('dx-navbar-fullscreen-open')) {
                burger.add(burgerFull).removeClass('active');
                $navbarFull.removeClass('dx-navbar-fullscreen-open');
                $navbarFull.addClass('dx-navbar-fullscreen-closed');
                bodyOverflow(0);
            }
        });

        // Dropdown Collapse
        dropItem.each(function () {
            const $thisItem = $(this);
            const dropItemLink = $thisItem.find('> a');
            $thisItem.find('.dx-navbar-dropdown').addClass('collapse');

            dropItemLink.on('click', function (e) {
                e.preventDefault();
                const $dropdown = $(this).next('.dx-navbar-dropdown');
                const dropdownChild = $dropdown.find('.dx-navbar-dropdown');
                const dropdownHeight = $dropdown.innerHeight();
                const dropdownSiblings = $thisItem.siblings().find('.show');
                const dropdownSiblingsHeight = dropdownSiblings.innerHeight();

                if (!$dropdown.hasClass('show')) {
                    $dropdown.removeClass('collapse').addClass('collapsing').innerHeight(dropdownHeight);

                    $dropdown.on('transitionend webkitTransitionEnd oTransitionEnd', () => {
                        $dropdown.addClass('show');
                        $dropdown.off('transitionend webkitTransitionEnd oTransitionEnd');
                    });
                } else {
                    $dropdown.innerHeight(dropdownHeight).addClass('collapsing').innerHeight(0);
                    $dropdown.removeClass('collapse').removeClass('show');
                    dropdownChild.innerHeight(dropdownHeight).addClass('collapsing').innerHeight(0);
                    dropdownChild.removeClass('collapse').removeClass('show');
                }
                if (dropdownSiblings.hasClass('show')) {
                    dropdownSiblings.innerHeight(dropdownSiblingsHeight).addClass('collapsing').innerHeight(0);
                    dropdownSiblings.removeClass('collapse').removeClass('show');
                }
                $dropdown.one('transitionend webkitTransitionEnd oTransitionEnd', () => {
                    $dropdown.removeClass('collapsing').addClass('collapse').innerHeight('');
                    dropdownChild.removeClass('collapsing').addClass('collapse').innerHeight('');
                    dropdownSiblings.removeClass('collapsing').addClass('collapse').innerHeight('');
                });
            });
        });
    }
}

export { initNavbar };
