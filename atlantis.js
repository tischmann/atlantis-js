'use strict';

let $$ = (function () {
    const eventHandlers = new Map();
    const atlantis = {}

    /**
     * Removes event listeners from HTML Elements
     * @param {HTMLCollection} elements
     * @param {Boolean} recursive Removes event listeners from children
     */
    const offEvents = function (HTMLCollection, recursive = true) {
        Array.from(HTMLCollection).filter(node => node.nodeType != 3)
            .forEach(function (node) {
                atlantis.off(node);
                if (recursive && node.children) offEvents(node.children);
            });
    }

    const mutationObserver = new MutationObserver((mutations) => {
        if ('removedNodes' in mutations[0]) {
            offEvents(mutations[0].removedNodes);
            Array.from(mutations[0].removedNodes).forEach(element => {
                element = undefined;
            });
        }
    });

    window.onload = function () {
        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
    * Creates HTML Element
    *
    * @param {String} tagName HTML Element tag name
    * @param {Object} attributes HTML Element attributes
    * @returns {HTMLElement} HTML Element
    */
    atlantis.create = function (tagName, attributes = {}) {
        const element = document.createElement(tagName);

        if (attributes instanceof Object) {
            Object.entries(attributes).forEach(([key, value]) => {
                if (key == 'class') {
                    if (!value) return;
                    if (typeof value == 'string') value = value.split(' ');
                    if (!(value instanceof Array)) return;
                    return value.forEach(name => element.classList.add(name));
                } else if (key == 'style') {
                    return atlantis.css(element, value);
                }

                element.setAttribute(key, value);
            });
        }

        return element;
    }

    /**
     * Adds event listener to HTML Element
     *
     * @param {HTMLElement} element
     * @param {String} event
     * @param {Function} handler
     * @param {Boolean} capture
     */
    atlantis.on = function (element, event, handler, capture = false) {
        if (!element) return;
        const set = eventHandlers.get(event) || new Set();
        eventHandlers.set(event, set.add({ element, handler, capture }));
        element.addEventListener(event, handler, capture);
    }

    /**
     * Removes event listener from HTML Element
     *
     * @param {HTMLElement} element
     * @param {String} event
     * @param {Function} handler
     * @returns
     */
    atlantis.off = function (element, event, handler) {
        if (!element) return;
        if (!eventHandlers.has(event)) return false;

        loop: for (const [name, set] of eventHandlers) {
            if (event && name !== event) continue;

            for (const obj of set) {
                if (handler && obj.handler !== handler) continue;
                element.removeEventListener(name, obj.handler, obj.capture);
                set.delete(obj);
                if (handler) break loop;
            }

            if (event) break;
        }
    }

    /**
     * Asynchronous request
     *
     * @param {Object} options
     * @param {String} options.method
     * @param {String} options.url
     * @param {Object} options.body
     * @param {Function} options.success
     * @param {Function} options.failure
     * @param {Object} options.headers
     */
    atlantis.fetch = function ({
        method = 'GET',
        url = '/',
        body = {},
        success = function () { },
        failure = function () { },
        headers = {}
    } = {}) {
        method = method.toUpperCase();

        const init = { method, headers };

        if (method == 'POST') init.body = JSON.stringify(body);

        fetch(url, init)
            .then(response => success(response))
            .catch(error => failure(error));
    }

    /**
     * Converts camelCase string into dash-case string
     *
     * @param {String} someString
     * @returns {String} some-string
     */
    atlantis.camelToDash = function (string) {
        return string.split(/(?=[A-Z])/)
            .map(value => value.toLowerCase())
            .join('-');
    }

    /**
     * Converts dash-case string into camelCase string
     *
     * @param {String} some-string
     * @returns {String} someString
     */
    atlantis.dashToCamel = function (string) {
        return string.split('-').map((value, index) => {
            value = value.toLowerCase();
            if (!index) return value;
            return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
        }).join('');
    }

    /**
     * Gets & sets document cookies
     * @param {...any} args
     * @returns {String|void} Cookie value
     */
    atlantis.cookie = function (...args) {
        const options = {
            path: '/',
            secure: true,
            samesite: 'strict',
            'max-age': 60 * 60 * 24 * 14
        };

        if (args.length == 3) options = { ...options, ...args[2] };

        if (args.length == 1) {
            args[0] = args[0].replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1');
            const regex = new RegExp(`(?:^|; )${args[0]}=([^;]*)`);
            const matches = document.cookie.match(regex);
            return matches ? decodeURIComponent(matches[1]) : undefined;
        } else if (args.length == 2) {
            let cookie = `${encodeURIComponent(args[0])}=${encodeURIComponent(args[1])}`;

            if (options.expires || false instanceof Date) {
                options.expires = options.expires.toUTCString();
            }

            Object.entries(options).forEach(([key, value]) => {
                if (value === false) value = '';
                cookie += `;${key}=${value}`;
            });

            document.cookie = cookie;
        }
    }

    /**
     * Creates datepicker attached to HTML element
     * @param {HTMLElement} element HTML Element
     * @param {Object} options
     * @returns {Object} Datepicker object
     */
    atlantis.datepicker = function (element, {
        locale = 'ru',
        date = new Date(),
        current = date,
        callback = function () { }
    } = {}) {
        if ('_datepicker' in element) return element._datepicker;

        const today = new Date();
        const container = atlantis.create('div', {
            class: 'atlantis-datepicker-container'
        });
        const yearsWrapper = atlantis.create('div', {
            class: 'atlantis-datepicker-years-wrapper'
        });
        const monthWrapper = atlantis.create('div');

        let years;
        let months;
        let monthTable;
        const labels = { days: [], months: [] };

        for (let d = 1; d <= 7; d++) {
            labels.days.push(
                (new Date(2020, 10, d))
                    .toLocaleString(locale, { weekday: 'short' })
            );
        }

        for (let m = 0; m <= 11; m++) {
            labels.months.push(
                (new Date(2021, m, 1))
                    .toLocaleString(locale, { month: 'long' })
            );
        }

        function destroyYears() {
            if (years) {
                years.remove();
                years = undefined;
            }
        }

        function destroyMonths() {
            if (months) {
                months.remove();
                months = undefined;
            }
        }

        function getYears() {
            destroyYears();
            years = atlantis.create('select');

            for (let year = 2011; year <= today.getFullYear(); year++) {
                const newDate = new Date(year, date.getMonth(), date.getDate());
                const option = atlantis.create('option');

                if (year == current.getFullYear()) {
                    option.selected = 'selected';
                    option.classList.add('current');
                }

                option.value = newDate.toLocaleDateString('en-US');
                option.innerHTML = newDate.toLocaleDateString(locale, {
                    year: 'numeric'
                });
                years.append(option);
            }

            atlantis.on(years, 'change', refreshMonthTable);
            return years;
        }


        function getMonths() {
            destroyMonths();

            months = atlantis.create('select');

            for (let month = 0; month <= 11; month++) {
                const newDate = new Date(date.getFullYear(), month, date.getDate());
                const option = atlantis.create('option');

                if (month == current.getMonth()) {
                    option.selected = 'selected';
                    option.classList.add('current');
                }

                option.value = newDate.toLocaleDateString('en-US');
                option.innerHTML = labels.months[month];
                months.append(option);
            }

            atlantis.on(months, 'change', refreshMonthTable);

            return months;
        }

        function clickHandler(event) {
            event.stopPropagation();
        }

        function refreshMonthTable(event) {
            date = new Date(Date.parse(this.value));
            destroyTable();
            monthWrapper.append(getTable());
        }

        function getDaysInMonth(month, year) {
            return new Date(year, month + 1, 0).getDate();
        }

        function getTable() {
            const year = date.getFullYear();
            const month = date.getMonth();
            const days_in_month = getDaysInMonth(month, year);
            const first_day_date = new Date(year, month, 1);
            const first_day_weekday = first_day_date.getDay();
            const prev_month = month == 0 ? 11 : month - 1;
            const prev_year = prev_month == 11 ? year - 1 : year;
            const prev_days = getDaysInMonth(prev_month, prev_year);

            monthTable = document.createElement('table');

            const thead = document.createElement('thead');

            let tr = document.createElement('tr', {
                class: 'week-days'
            });

            for (let d = 1; d <= 7; d++) {
                const th = document.createElement('th');
                th.innerHTML = labels.days[d < 7 ? d : 0];
                tr.append(th);
            }

            thead.append(tr);
            monthTable.append(thead);

            let week = 0;
            let next_month_day = 1;
            let day = 1;

            const tbody = document.createElement('tbody');

            for (let i = 1; i < 42; i++) {
                if (week == 0) {
                    tr = document.createElement('tr');
                    tr.classList.add('week');
                }

                const td = document.createElement('td');

                if (i < new Date(year, month, 1).getDay()) {
                    td.innerHTML = prev_days - first_day_weekday + i + 1;
                    tr.append(td);
                } else if (day > days_in_month) {
                    td.innerHTML = next_month_day;
                    tr.append(td);
                    next_month_day++;
                } else {
                    const dayDate = new Date(year, month, day);

                    td.innerHTML = day;

                    if (day == today.getDate() &&
                        today.getMonth() == month &&
                        today.getFullYear() == year
                    ) {
                        td.classList.add('today');
                    }

                    if (day == date.getDate() &&
                        current.getMonth() == month &&
                        current.getFullYear() == year
                    ) {
                        td.classList.add('current');
                    }

                    td.setAttribute('data-time', dayDate.getTime());
                    atlantis.on(td, 'click', callback);
                    tr.append(td);
                    day++;
                }

                if (week == 6) {
                    tbody.append(tr);
                    week = 0;
                } else {
                    week++;
                }
            }

            monthTable.append(tbody);

            return monthTable;
        }

        function show(event) {
            event.stopPropagation();

            if (monthTable) return false;

            atlantis.on(document, 'click', hide);

            destroyYears();
            destroyMonths();

            yearsWrapper.append(getMonths());
            yearsWrapper.append(getYears());

            destroyTable();

            monthWrapper.append(getTable());
            document.body.append(container);

            atlantis.on(container, 'click', clickHandler);

            const offset = element.getBoundingClientRect();
            container.style.top = `${offset.top + offset.height}px`;
            container.style.left = `${offset.left}px`;
        }

        function destroyTable() {
            if (monthTable) {
                monthTable.remove();
                monthTable = undefined;
            }
        }

        function hide() {
            destroyTable();
            container.remove();
            atlantis.off(document, 'click', hide);
        }

        function destroy() {
            hide();
            container = undefined;
            atlantis.off(element);
            delete element._datepicker;
        }

        container.append(yearsWrapper);
        container.append(monthWrapper);

        atlantis.on(element, 'click', show);

        element._datepicker = {
            show: show,
            hide: hide,
            destroy: destroy
        };

        return element._datepicker;
    }

    /**
     * Allow HTML element to be moved using the mouse
     * @param {HTMLElement} element HTML Element
     * @param {HTMLElement} options.parent
     * @param {String} options.axis
     * @param {Function} options.drag
     * @param {Function} options.start
     * @param {Function} options.stop
     * @returns {Object} Draggable object
     */
    atlantis.draggable = function (element, {
        parent = element.parentNode,
        axis = '',
        drag = function () { },
        start = function () { },
        stop = function () { }
    } = {}) {
        if ('_draggable' in element) return element._draggable;

        let isMouseDown = false;
        const diff = { x: 0, y: 0 };

        function mouseDown(event) {
            isMouseDown = true;
            diff.x = event.clientX - element.offsetLeft;
            diff.y = event.clientY - element.offsetTop;
            start();
        }

        function mouseUp() {
            isMouseDown = false;
            stop();
        }

        function mouseMove(event) {
            if (!isMouseDown) return false;

            const position = {
                top: event.clientY - diff.y,
                left: event.clientX - diff.x
            };

            const containment = {
                right: parent.clientWidth - element.clientWidth,
                bottom: parent.clientHeight - element.clientHeight
            };

            if (position.top < 0) {
                position.top = 0;
            } else if (position.top > containment.bottom) {
                position.top = containment.bottom;
            }

            if (position.left < 0) {
                position.left = 0;
            } else if (position.left > containment.right) {
                position.left = containment.right;
            }

            switch (axis) {
                case 'x':
                    element.style.left = `${position.left}px`;
                    break;
                case 'y':
                    element.style.top = `${position.top}px`;
                    break;
                default:
                    element.style.top = `${position.top}px`;
                    element.style.left = `${position.left}px`;
                    break;
            }

            drag();
        }

        function destroy() {
            atlantis.off(document, 'mousemove', mouseMove);
            atlantis.off(element, 'mouseup', mouseUp);
            atlantis.off(element, 'mousedown', mouseDown);
            delete element._draggable;
            return element;
        }

        function create() {
            atlantis.on(document, 'mousemove', mouseMove);
            atlantis.on(element, 'mouseup', mouseUp);
            atlantis.on(element, 'mousedown', mouseDown);
        }

        create();

        element._draggable = { destroy };

        return element._draggable;
    }

    /**
     * Checks if element is visible
     *
     * @param {HTMLElement} element
     * @returns {Boolean} true | false
     */
    atlantis.isVisible = function (element) {
        return element.offsetWidth > 0 || element.offsetHeight > 0;
    }

    /**
     * Get the ancestor of element filtered by a selector
     * @param {HTMLElement} element HTML element
     * @param {String} selector Parent HTML Element CSS selector
     * @returns {HTMLElement|undefined} HTML element | undefined
     */
    atlantis.parent = function (element, selector) {
        if (!selector) return;

        while (true) {
            element = element.parentNode;

            if (!element) return;
            if (element === document.body) return;

            if (element.parentNode.querySelector(selector)) {
                return element;
            }
        }
    }

    /**
     * Gets element height
     * @param {HTMLElement} element
     * @returns {Number} Height
     */
    atlantis.height = function (element) {
        return parseFloat(getComputedStyle(element).height.replace("px", ""));
    }

    /**
     * Gets element width
     * @param {HTMLElement} element
     * @returns {Number} Width
     */
    atlantis.width = function (element) {
        return parseFloat(getComputedStyle(element).width.replace("px", ""));
    }

    /**
     * Sets CSS properties to HTML element
     * @param {HTMLElement} element HTML element
     * @param {Object} properties CSS properties
     */
    atlantis.css = function (element, properties = {}) {
        if (properties instanceof Object) {
            Object.entries(properties).forEach(([key, value]) => {
                element.style[atlantis.dashToCamel(key)] = value;
            })
        }
    }

    /**
     * Removes highlights from HTML element
     * @param {HTMLElement} element
     */
    atlantis.unhighlight = function (element) {
        element.innerHTML = element.innerHTML
            .replace(/(<span class="highlight">|<\/span>)/igm, "");
    }

    /**
     * Highlights string
     * @param {HTMLElement} element
     * @param {String} value
     * @param {Function} callback
     * @param {String} type
     * @param {String} classname
     * @returns {Number} Number of values found
     */
    atlantis.highlight = function (
        element,
        value = '',
        callback = function () { },
        type = 'span',
        classname = 'highlight'
    ) {
        let count = 0;

        value = value.replace(/\\/, '');

        if (!value) return count;

        element.innerHTML = element.innerHTML.replace(
            new RegExp(`(${value})`, "gim"),
            function (match, p1) {
                callback(element);
                const wrapper = atlantis.create(type, { class: classname });
                wrapper.innerHTML = p1;
                count++;
                return wrapper.outerHTML;
            }
        );

        return count;
    }

    /**
     * Counts HTML elements by CSS selector
     * @param {HTMLElement} parentNode
     * @param {String} selector
     * @returns {Number} Number of elements
     */
    atlantis.count = function (parentNode, selector) {
        return parentNode.querySelectorAll(selector).length;
    }

    /**
     * Triggers event on HTML element
     *
     * @param {HTMLElement} element
     * @param {String} event
     * @param {Object} data
     * @returns {CustomEvent} event
     */
    atlantis.trigger = function (element, event, data = {}) {
        let customEvent;

        if (window.CustomEvent && typeof window.CustomEvent === 'function') {
            customEvent = new CustomEvent(event, { detail: data });
        } else {
            customEvent = document.createEvent('CustomEvent');
            customEvent.initCustomEvent(event, true, true, data);
        }

        return element.dispatchEvent(customEvent);
    }

    return atlantis;
}());