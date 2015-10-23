export default function (el, onchange) {
    var text = el.querySelector('.madlib__input__text');
    var btn = el.querySelector('.madlib__input__btn');
    var currentValue = '';

    function submit() {
        currentValue = text.value;
        onchange(text.value);
        text.blur();
        btn.removeAttribute('data-focus');
    }

    text.addEventListener('focus', () => { btn.setAttribute('data-focus', ''); });
    text.addEventListener('blur', evt => {
        // Wait for new activeElement
        setTimeout(() => {
            if (document.activeElement !== btn) {
                text.value = currentValue;
                btn.removeAttribute('data-focus');
            }
        }, 0);
    });

    el.addEventListener('submit', evt => {
        evt.preventDefault();
        submit();
    });

    btn.addEventListener('click', evt => {
        evt.preventDefault();
        if (btn.hasAttribute('data-focus')) {
            submit();
        } else {
            currentValue = text.value = '';
            text.focus();
        }
    });
}
