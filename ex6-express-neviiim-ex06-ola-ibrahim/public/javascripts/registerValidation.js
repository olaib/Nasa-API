const NAME_MSG = 'Name must contain only small letters and numbers and between 3 and 32 characters';
const EMAIL_MSG = 'Invalid Email , please enter a valid email for example: jhon@example.com';

// init module
(function () {
    document.addEventListener("DOMContentLoaded", function () {
        document.getElementById("registerForm").addEventListener('submit', checkForm);
    })

    function checkForm(event) {
        event.preventDefault();
        let form = ["lname", "fname", "email"];
        let formValid = true;
        form.forEach(value => {
            const elem = event.target.querySelector(`#${value}`);
            const validate = (value === 'email') ? validation.checkEmail(elem.value) : validation.checkName(elem.value);
            // Check if the field value is valid
            const errorElem = elem.nextElementSibling;
            if (!validate.isValid) {
                // If the field is invalid, set the error message and show the error element
                errorElem.innerHTML = validate.errMessage;
                show(errorElem);
                formValid = false;
            } else {
                hide(errorElem);
            }
        });
        if (formValid) {
            event.target.submit();
        }
        else {
            return false;
        }
    }

    const hide = (elem) => {
        elem.classList.add('d-none');
    }
    const show = (elem) => {
        elem.classList.remove('d-none');
    }
})();

const validation = (function () {
    const NAME_REGEX = /^[a-zA-Z]{3,32}$/;
    const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    const checkName = (str) => {
        return {
            isValid: NAME_REGEX.test(str),
            errMessage: NAME_MSG
        }
    }
    const checkEmail = (str) => {
        return {
            isValid: EMAIL_REGEX.test(str),
            errMessage: EMAIL_MSG
        }
    }
    return {
        checkName,
        checkEmail
    }
})()
