function Qismo(appID, options){
    // qismo uses notification, ask for permission if not granted
    if ('Notification' in window && Notification.permission !== "granted") Notification.requestPermission();
    if(!options) options = {};
    let isQismoLogin = false;
    let isStartingNewSession = false;

    this.ls = JSON.parse(localStorage.getItem('qismo-widget'));
    this.defaultConfig = {
        "customerServiceAvatar": "https://d1edrlpyc25xu0.cloudfront.net/kiwari-prod/image/upload/Ri-pxHv6e1/default_avatar.png",
        "customerServiceName": "Customer Service",
        "buttonText": "Talk to Us",
        "buttonHasIcon": "true",
        "buttonIcon": 'https://s3-ap-southeast-1.amazonaws.com/qiscus-sdk/public/qismo/img/icon-qiscus-widget-default.svg',
        "formGreet": "Welcome to Live Chat",
        "openAtStart": false,
        "welcomeText": "Hellow, how are you. if you need our help don't hesitate to chat with us",
        "welcomeMessageStatus": false,
        "welcomeTimeout":20,
        "qismoBaseUrl": (options.staging) ? 'https://qismo-stag.qiscus.com' : 'https://qismo.qiscus.com',
        'callbackFunction': {
            "afterFormValidation": false
        },
        "customerIdentifierInputType": "email",
    };
    this.loginFormOpened = false;

    // variables definition
    var isMinimized = true,
        ls = JSON.parse(localStorage.getItem('qismo-widget')),
        self = this,
        isRegistrationFormNeeded = window.userId ? false : true;

    // Qismo Code start here
    // now let's pull all of our dependency here, sdk js and css
    attachQiscusSDKDependencies();

    function initiateQismo() {
        //=== LOAD QISMO CONFIGURATION ===//
        self.$ajax({
            type: 'GET',
            url: self.defaultConfig.qismoBaseUrl+'/api/v1/app/config/public-widget/'+appID,
            successFn: function(res) {
                var data = res.data.widget;
                setDefaultConfig(data);
                attachQismoCustomCSS(data ? data.styles : null);
                self.renderQismoWidget();
            },
            failFn: function(err) {},
        });
    }

    //=== SET CONFIGURATION OBJECT (FROM API OR FROM USER) ===//
    function setDefaultConfig(data) {
        var initialValue = {
            "buttonHasText": true,
            "openAtStart": true,
            "welcomeMessageStatus": true,
            "welcomeText": "Hi there! Do you want to have a chat widget like this? It's so easy and customisable! So, come on have a chat with us!  ",
            "welcomeTimeout": "3",
            "buttonHasIcon": true,
            "buttonIcon": 'https://s3-ap-southeast-1.amazonaws.com/qiscus-sdk/public/qismo/img/icon-qiscus-widget-default.svg',
            "qismoBaseUrl": (options.staging) ? '//qismo-stag.qiscus.com' : '//qismo.qiscus.com',
        };
        if(!window.qismoConfig) window.qismoConfig = {};
        if(options) window.qismoConfig = Object.assign({}, qismoConfig, options);
        attachEventListenerChat()
        if(!data) {
            qismoConfig = Object.assign({}, initialValue, qismoConfig);
            return qismoConfig;
        }
        Object.keys(data.variables).forEach(function(key) {
            qismoConfig[key] = data.variables[key];
        });
    }

    //=== ATTACH QISMO CUSTOM CSS SET FROM ADMIN DASHBOARD ===//
    function attachQismoCustomCSS(style) {
        if(!style) {
            self.$('head').appendChild(self.createNode('style', '.qcw-header { background: #74c162 !important; }'));
            return false;
        }
        var cssstring = Object.keys(style).reduce(function (previous, key) {
            return previous + key + JSON.stringify(style[key]).replace(/['"]+/g, '').replace(/[,]+/g, ';');
        }, '');
        // get base color
        var baseBgColor = '#74c162';
        var baseTextColor = '#FFFFFF';
        // override basebgcolor if it's being set on dashboard
        if(style['.qcw-header,.qismo-login-form__header']) {
            baseBgColor = style['.qcw-header,.qismo-login-form__header']['background-color'].replace('!important', '').trim();
            baseTextColor = '#444444';
            if(baseBgColor.toLowerCase() == '#ffffff') {
                cssstring += '.qismo-contact-icon,.qismo-email-icon{fill:'+baseBgColor+';}';
                cssstring += '.qismo-phone-icon{stroke:'+baseBgColor+';}';
                cssstring += '.qismo-input .icon{background:'+convertHex('#444444', 20)+'!important;}';
                cssstring += '.qcw-copyright,.qismo-input input {color:#444 !important;}';
                cssstring += '.qismo-login-form__header { color: '+baseTextColor+';}';
                cssstring += '.qcw-cs-box-form { background: #444; }';
            } else {
                cssstring += '.qismo-contact-icon,.qismo-email-icon{fill:'+baseBgColor+';}';
                cssstring += '.qismo-phone-icon{stroke:'+baseBgColor+';}';
                cssstring += '.qismo-input .icon{background:'+convertHex(baseBgColor, 20)+'!important;}';
                cssstring += '.qcw-copyright,.qismo-copyright,.qismo-input input {color:'+baseBgColor+'!important;}';
            }
        }
        if(!qismoConfig.buttonHasIcon) cssstring += '.qcw-trigger-btn img { display:none;}';

        var node = document.createElement('style');
        node.appendChild(document.createTextNode(cssstring));
        self.$('head').appendChild(self.createNode('style', cssstring));
    }

    function hexToRgb(hex) {
        // turn hex val to RGB
        var rgx = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;
        var result = rgx.exec(hex);
        return {
            r: parseInt(rgx.exec(hex)[1], 16),
            g: parseInt(rgx.exec(hex)[2], 16),
            b: parseInt(rgx.exec(hex)[3], 16)
        }
    }

    // calc to work out if it will match on black or white better
    function setContrast(rgb) {
        return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000 > 125 ? '#444' : '#FFF';
    }

    function convertHex(hex,opacity){
        hex = hex.replace('#','');
        r = parseInt(hex.substring(0,2), 16);
        g = parseInt(hex.substring(2,4), 16);
        b = parseInt(hex.substring(4,6), 16);

        result = 'rgba('+r+','+g+','+b+','+opacity/100+')';
        return result;
    }

    //=== SET QISCUS SDK DEPENDENCIES ===//
    function attachQiscusSDKDependencies() {
        var head = document.head;
        var sdkjs = document.createElement('script');
        sdkjs.type = 'text/javascript';
        sdkjs.src = 'https://multichannel.qiscus.com/js/qiscus-sdk.2.8.6.js?v=1.0.2';

        // Then bind the event to the callback function.
        // There are several events for cross browser compatibility.
        sdkjs.onreadystatechange = initiateQismo;
        sdkjs.onload = initiateQismo;

        var iTijs = document.createElement('script');
        iTijs.type = 'text/javascript';
        iTijs.src = 'https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/16.0.4/js/intlTelInput.min.js';

        // Fire the loading
        head.appendChild(iTijs);
        head.appendChild(sdkjs);
        var sdkcss = self.createNode('link', null, {
            'rel': 'stylesheet',
            'href': 'https://qiscus-sdk.s3-ap-southeast-1.amazonaws.com/public/qiscus-sdk.2.8.5-rc6.css',
        });
        var iTicss = self.createNode('link', null, {
            'rel': 'stylesheet',
            'href': 'https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/16.0.4/css/intlTelInput.css',
        });
        var qismocss = self.createNode('link', null, {
            'rel': 'stylesheet',
            // 'href': 'https://s3-ap-southeast-1.amazonaws.com/qiscus-sdk/public/qismo/qismo-latest.css',
            'href': `${self.defaultConfig.qismoBaseUrl}/css/qismo-latest.css`,
        });

        self.$('head').appendChild(sdkcss);
        self.$('head').appendChild(iTicss);
        self.$('head').appendChild(qismocss);
        self.$('body').insertAdjacentHTML('afterbegin', '<div id="qiscus-widget"></div>');
    }

    self.renderQismoTriggerButton = function() {
        var buttonText = (qismoConfig.buttonHasText)
                        ? ((qismoConfig.buttonText) ? qismoConfig.buttonText : self.defaultConfig.buttonText)
                        : '',
            buttonIcon = qismoConfig.buttonIcon || self.defaultConfig.buttonIcon,
            // buttonContent = '<img src="'+buttonIcon+'" class="qismo-trigger__icon"><div class="qismo-triger__text">'+buttonText+'</div>',
            imagePart = qismoConfig.buttonHasIcon && buttonIcon ? '<img src="'+buttonIcon+'">' : '',
            textPart = buttonText ? '<div>'+buttonText+'</div>' : '',
            buttonContent = imagePart + textPart;
            button = self.createNode('div', null, {
                'class': 'qcw-trigger-btn qcw-cs-trigger-button'
            });
            button.insertAdjacentHTML('afterbegin', buttonContent);
        self.$('.qcw-cs-container').appendChild(button);
    }



    attachWidgetInputFormListener();

    function closeWelcomeDialog() {
        // loginFormOpened = !loginFormOpened;
        if(self.$('.qcw-cs-welcome')) self.$('.qcw-cs-welcome').style.display = 'none';
        var userData = localStorage.getItem('qismo-widget');
        if(userData) {
            userData = JSON.parse(userData);
            userData['isWelcomeDialogClosed'] = true;
        } else {
            userData = {isWelcomeDialogClosed: true};
        }
        localStorage.setItem('qismo-widget', JSON.stringify(userData))
    }

    function attachEventListenerChat(){
        var targetClass = ['qcw-trigger-btn','qcw-cs-trigger-button','qcw-cs-close', 'qcw-cs-close-welcome','qcw-window-toggle-btn'];
        var closeIcon = 'https://s3-ap-southeast-1.amazonaws.com/qiscus-sdk/public/qismo/img/ic_cancel.svg';
        var filterClass = function(e) {
            if(!e.target) return false;
            for(var i=0; i<=targetClass.length; i++) {
                if(e.target.classList.contains(targetClass[i])) return true;
            }
            for(var j=0; j<=targetClass.length; j++) {
                if(e.target.parentNode.classList.contains(targetClass[j])) return true;
            }
            return false;
        }
        if (screen.width > 768) {
            document.addEventListener('click', function(e) {
                var buttonIcon = qismoConfig.buttonIcon;
                if(filterClass(e)) {
                    closeWelcomeDialog();
                    if (self.$('.qcw-cs-container--open') || self.$('.qcw-container--open')) {
                        loginFormOpened = false;
                        if(qismoConfig.buttonIcon) self.$('.qcw-trigger-btn img').src=qismoConfig.buttonIcon;
                        self.fadeOut(self.$('.qcw-cs-box-form'), function(){
                            self.$('.qcw-cs-container').classList.remove('qcw-cs-container--open')
                        });
                    } else {
                        loginFormOpened = true;
                        if(qismoConfig.buttonIcon) self.$('.qcw-trigger-btn img').src=closeIcon;
                        self.fadeIn(self.$('.qcw-cs-box-form'));
                        if(self.$('.qcw-cs-container')) return self.$('.qcw-cs-container').classList.add('qcw-cs-container--open')
                    }
                }
            }, false)
        } else {
            document.addEventListener('click', function(e) {
                var buttonIcon = qismoConfig.buttonIcon;
                if(filterClass(e)) {
                    closeWelcomeDialog();
                    if (self.$('.qcw-cs-container--open') || self.$('.qcw-container--open')) {
                        loginFormOpened = false;
                        self.$('.qcw-cs-container').classList.remove('qcw-cs-container--open');
                        self.$('body').classList.remove('--modalOpen');
                        if(qismoConfig.buttonIcon) self.$('.qcw-trigger-btn img').src=qismoConfig.buttonIcon;
                    } else {
                        loginFormOpened = true;
                        self.$('.qcw-cs-container').classList.add('qcw-cs-container--open')
                        self.$('body').classList.add('--modalOpen')
                        if(qismoConfig.buttonIcon) self.$('.qcw-trigger-btn img').src=closeIcon;
                        document.ontouchmove = function (event) {
                            event.preventDefault();
                        }
                    }
                }
            }, false)
        }

        function $filter(data, filterFn) {
            Array.prototype.filter.call(data, filterFn);
        }
    }

    function attachWidgetInputFormListener() {
        // document.addEventListener('focus', function(e){
        //     if(e.target.parentElement.classList.contains('qcw-comment-form')) {
        //         toggleClass($('.qcw-comment-form'), 'qcw-comment-form--focused');
        //     }
        // });
        // document.addEventListener('blur', function(e){
        //     if(e.target.parentElement.classList.contains('qcw-comment-form')) {
        //         removeClass($('.qcw-comment-form'), 'qcw-comment-form--focused');
        //     }
        // });
    }

    function _changeCSRoomInfo() {
        qiscus.selected.name = qismoConfig.customerServiceName || self.defaultConfig.customerServiceName
        qiscus.selected.avatar = qismoConfig.customerServiceAvatar || self.defaultConfig.customerServiceAvatar
    }

    function _chatGroup(id) {
        return QiscusSDK.core.UI.chatGroup(id)
            .then(res => {
                if (!self.$('.qcw-copyright')) {
                    // code to run if it isn't there
                    var copyrightHtml = '<div class="qcw-copyright" style="justify-content: center; height: 28px; font-size: 10px;color: #a3a3a3;text-align: center;display: flex;position: relative;-webkit-box-pack: justify;order: 3;background:#FFF;border-top: 1px solid rgba(0,0,0,.1);">'+
                    'Powered by <a href="https://qiscus.com" target="_blank" style="display:inline-block;margin-left: 3px;color: #a3a3a3;">Qiscus</a>'+
                    '</div>';
                    if(self.$('.qcw-chat-wrapper')) self.$('body .qcw-chat-wrapper').insertAdjacentHTML('beforeend',copyrightHtml);
                }
                if(options.callbacks && 'roomChangedCallback' in options.callbacks) options.callbacks.roomChangedCallback(qiscus.selected);
                isMinimized = false;
                _changeCSRoomInfo();
                return Promise.resolve(res);
            }, err => Promise.reject(err));
    }

    /** Attention Grabber */
    this.getButtonText = function(){
        if(qismoConfig.buttonHasText && typeof qismoConfig.buttonText === "undefined") {
            return self.defaultConfig.buttonText;
        }else if(qismoConfig.buttonHasText && qismoConfig.buttonText !== "undefined"){
            return qismoConfig.buttonText;
        }else{
            return "";
        }
    }

    self.ValidateEmail = function(mail) {
        if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(self.$('#inputEmail').value)) return true;
        self.toggleClass(self.$('#inputEmail').parentElement, 'qismo-input-error');
        self.toggleClass(self.$('.qismo-form-error.qismo-email-error'), 'qismo-form-error--visible');
        return false;
    }


    const defaultInitOptions = {
        loginSuccessCallback: function (userData) {
            if(isQismoLogin && (isQismoLogin && !isStartingNewSession)) return false;
            if (qismoConfig.openAtStart) {
                QiscusSDK.core.UI.autoExpandWidget = true;
                _chatGroup(window.roomId)
            }
            renderStartNewChat();
            if(options.callbacks && 'loginSuccessCallback' in options.callbacks) options.callbacks.loginSuccessCallback(userData);
            isQismoLogin = true;
            isStartingNewSession = false;
        },
        // roomChangedCallback: function(data) {
        //     _changeCSRoomInfo();
        // },
        newMessagesCallback: function (data) {
            if ('Notification' in window && Notification.permission !== "granted") showNotif(data);
            // scrolling to bottom
            setTimeout(function () {
                const selected = QiscusSDK.core.selected;
                if(!selected || (selected && !selected.comments.length)) return false;
                lastCommentId = QiscusSDK.core.selected.comments[QiscusSDK.core.selected.comments.length - 1].id;
                theElement = document.getElementById(lastCommentId);
                theElement.scrollIntoView({ block: 'end', behaviour: 'smooth' })
            }, 200);
            if (data[0].type == 'system_event' &&
                data[0].message.toLowerCase().indexOf('as resolved') > -1) {
                getAppSession().then(function(res){
                    if(res.data.is_sessional) {
                        var el = self.$('body');
                        if (el.classList) {
                            el.classList.toggle('resolved-conversation');
                        } else {
                            var classes = el.className.split(' ');
                            var existingIndex = classes.indexOf('resolved-conversation');

                            if (existingIndex >= 0)
                                classes.splice(existingIndex, 1);
                            else
                                classes.push(className);

                            el.className = classes.join(' ');
                        }
                    }
                    renderStartNewChat();
                });
            }
            if(options.callbacks && 'newMessagesCallback' in options.callbacks) options.callbacks.newMessagesCallback(data);
        }
    }

    this.initQiscusWidget = function(userData, windowState) {
        var baseURL = (options.staging) ? 'https://qismo-stag.qiscus.com' : 'https://qismo.qiscus.com',
            appId = appID,
            userId = window.userId,
            userName = window.userName,
            origin = window.location.href,
            roomBadge = qismoConfig.roomBadge,
            avatar = 'https://d1edrlpyc25xu0.cloudfront.net/kiwari-prod/image/upload/wMWsDZP6ta/1516689726-ic_qiscus_client.png';

        if(userData) {
            userId = userData.user_id;
            userName = userData.user_name;
        }

        QiscusSDK.core.init({
            AppId: appID,
            sync: 'both',
            options: window.qiscusInitOptions
                ? Object.assign({}, defaultInitOptions, window.qiscusInitOptions)
                : defaultInitOptions,
        })
        QiscusSDK.core.getNonce().then(function(res) {
            // Initiate Room
            if(typeof windowState != "undefined" && windowState === true){
                qismoConfig.openAtStart = true;
            }
            var params = {
                'app_id': appID,
                'user_id': userId,
                'name': userName,
                'avatar': avatar,
                'nonce': res.nonce,
                'extras' : JSON.stringify({
                    'timezone_offset' : new Date().getTimezoneOffset() / -60
                })
            }

            if(origin) params.origin = origin;
            if(roomBadge) params.room_badge = roomBadge;

            var initRoom = self.$ajax({
                type: 'POST',
                url: baseURL + '/api/v1/qiscus/initiate_chat',
                data: params,
                successFn: initRoomDone,
                failFn: function(error) { console.error(error); }
            });
            function initRoomDone(data) {
                self.removeClass(self.$('.qcw-cs-container'), 'qcw-cs-container--open');
                self.$('body').classList.remove('resolved-conversation');
                self.removeElement(self.$('.qcw-cs-container'));

                window.isSessional = data.data.is_sessional
                window.roomId = data.data.room_id
                var sdkEmail = userId,
                    identityToken = data.data.identity_token
                // var password = data.data.sdk_user.password,
                //     sdkEmail = data.data.sdk_user.email

                if(!QiscusSDK.core.isInit) QiscusSDK.core.init({
                    AppId: appID,
                    sync: 'both',
                    options: window.qiscusInitOptions
                        ? Object.assign({}, defaultInitOptions, window.qiscusInitOptions)
                        : defaultInitOptions,
                })

                QiscusSDK.core.verifyIdentityToken(identityToken).then(function(verifyResponse) {
                    QiscusSDK.core.setUserWithIdentityToken(verifyResponse);
                })
                // QiscusSDK.core.setUser(sdkEmail, password, userName, 'https://d1edrlpyc25xu0.cloudfront.net/kiwari-prod/image/upload/wMWsDZP6ta/1516689726-ic_qiscus_client.png')
                QiscusSDK.render()

                QiscusSDK.core.UI.widgetButtonText = self.getButtonText();

                QiscusSDK.core.UI.widgetButtonIcon = qismoConfig.buttonIcon || self.defaultConfig.buttonIcon;
            }
        });
    }
    function getAppSession() {
        var baseURL = (options.staging) ? 'https://qismo-stag.qiscus.com' : 'https://qismo.qiscus.com';
        return self.$ajax({
            type: 'GET',
            url: baseURL + '/' + appID + '/get_session',
            successFn: function(data) {
                if(data.is_sessional) window.isSessional = data.is_sessional;
                return Promise.resolve(data);
            },
            failFn: function(error){
                return Promise.reject(error);
            },
        });
    }
    function renderStartNewChat() {
        if (!window.isSessional || self.$('.start-new-chat-container')) return false;
        var html = '<div class="start-new-chat-container">'
            + '<button>Start New Chat</button>'
            + '</div>';
        self.$('body .qcw-container').insertAdjacentHTML('afterbegin', html);
    }

    // button live chat sdk
    document.addEventListener('click', function (e) {
        if(e.target && (e.target.classList.contains('qcw-trigger-btn') || e.target.parentNode.classList.contains('qcw-trigger-btn'))) {
            if (isMinimized && !qiscus.selected && window.roomId) {
                _chatGroup(window.roomId);
            }
            isMinimized = !isMinimized;
        }
    });
    document.addEventListener('click', function (e) {
        if(!e.target) return false;
        if(e.target.parentNode.classList.contains('start-new-chat-container')) {
            var ls = JSON.parse(localStorage.getItem('qismo-widget'));
            isStartingNewSession = true;
            self.initQiscusWidget(ls, true);
        }
    });

    function showNotif(data) {
        // create the notification if only window is not focused
        if (document.hasFocus()) return

        if (data[0].email === QiscusSDK.core.user_id
            && data[0].room_id == QiscusSDK.core.selected.id) return false;

        const notif = new Notification('you get a chat from ' + data[0].username, {
            icon: data[0].user_avatar,
            body: (data[0].message.startsWith('[file]'))
                ? 'File attached.'
                : data[0].message,
        });
        notif.onclick = function () {
            notif.close();
            window.focus();
        }
    }

    //=== jQuery aliases counterpart ===//
}

Qismo.prototype.logout = function() {
    localStorage.clear();
    isQismoLogin = false;
    this.$('body').insertAdjacentHTML('afterbegin', '<div id="qiscus-widget"></div>');
    this.removeElement(this.$('.qismo-extra'));
    this.removeElement(this.$('.qcw-container'));
    this.renderQismoWidget();
}

//=== RENDER OUR QISMO WIDGET ===//
Qismo.prototype.renderQismoWidget = function() {
    // attach our container first
    this.$('body').insertAdjacentHTML('afterbegin', '<div class="qismo-extra"></div>');
    // now let's decide whether we should render login form or chat widget directly
    if(!this.ls || (!this.ls.user_id && !this.ls.user_name)) {
        this.renderQismoWidgetComponent();
    } else {
        this.initQiscusWidget(this.ls);
    }
}

Qismo.prototype.renderQismoWidgetComponent = function() {
    if(qismoConfig.attentionGrabberStatus) this.attachAttentionGrabber();
    if(qismoConfig.welcomeMessageStatus && !qismoConfig.attentionGrabberStatus) this.attachWelcomeDialog();
    this.attachLoginFormToDOM();
}

Qismo.prototype.attachAttentionGrabber = function() {
    var grabberTextStatus = qismoConfig.grabberTextStatus,
        grabberImage = qismoConfig.grabberImage,
        attentionGrabberImage = qismoConfig.attentionGrabberImage,
        attentionGrabberText = qismoConfig.attentionGrabberText;

    if(qismoConfig.attentionGrabberStatus){
        var self = this;
        // render the layout
        self.$('.qismo-extra').insertAdjacentHTML('beforeend', '<div class="qismo-attention-grabber">' +
            '<span class="qismo-attention-grabber__close-btn">&times;</span>' +
        '</div>');
        if(grabberImage) {
            self.$('.qismo-extra .qismo-attention-grabber').insertAdjacentHTML('afterbegin', '<div class="qcw-grabber-image">'+
                '<img src="'+attentionGrabberImage+'" />' +
            '</div>');
        }
        if(grabberTextStatus) {
            self.$('.qismo-extra .qismo-attention-grabber').insertAdjacentHTML('beforeend', '<div class="qcw-grabber-text">'+
                '<div>'+ attentionGrabberText +'</div>' +
            '</div>');
        }
        // attach the listeners
        self.addEvent(self.$('.qismo-attention-grabber__close-btn'), 'click', function() {
            self.$('.qismo-attention-grabber').style.display = 'none';
        })
    }
}

Qismo.prototype.attachWelcomeDialog = function(){
    var self = this;
    var welcomeText = qismoConfig.welcomeText || self.defaultConfig.welcomeText
    var welcomeCustomerServiceName = qismoConfig.customerServiceName || self.defaultConfig.customerServiceName
    var welcomeAvatarUrl = qismoConfig.customerServiceAvatar || self.defaultConfig.customerServiceAvatar
    var ls = localStorage.getItem('qismo-widget');
    if(ls) ls = JSON.parse(ls);
    var welcomeDialogStatus = !ls ? true : !ls.isWelcomeDialogClosed;

    if(qismoConfig.welcomeMessageStatus && welcomeDialogStatus){
        var welcomeContainer = '<div class="qcw-cs-welcome ">' +
            '<div class="qcw-header">'+
                '<div class="qcw-header-avatar">'+
                    '<img src="'+ welcomeAvatarUrl + '">'+
                '</div>'+
                '<div class="qcw-user-display-name">' + welcomeCustomerServiceName +'</div>'+
                '<span class="qcw-cs-close-welcome"><img src="https://s3-ap-southeast-1.amazonaws.com/qiscus-sdk/public/qismo/img/close-circle.svg"></span>' +
            '</div>'+
            '<div class="qcw-welcome-text">'+
                welcomeText+
            '</div>'+
        '</div>';

        var timeout = qismoConfig.welcomeTimeout >=0 ? qismoConfig.welcomeTimeout : self.defaultConfig.welcomeTimeout;

        setTimeout(function(){
            if(self.$('.qcw-cs-welcome')) return false;
            if(!self.loginFormOpened) {
                self.$('.qismo-extra').insertAdjacentHTML('afterbegin', welcomeContainer);
            }
        }, parseInt(timeout)*1000)
    }
}

Qismo.prototype.attachLoginFormToDOM = function() {
    var self = this;
    var greet = qismoConfig.formGreet || self.defaultConfig.formGreet;
    var customerIdentifierType = qismoConfig.customerIdentifierInputType || self.defaultConfig.customerIdentifierInputType;
    var customerIdentifier = '';
    if (customerIdentifierType == "email") {
        customerIdentifier = '<div class="qismo-input">' +
            '<div class="icon">'+
                '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">'+
                    '<path class="qismo-email-icon" fill-rule="evenodd" clip-rule="evenodd" d="M15.8195 2.77898C13.9957 2.02356 11.9889 1.82591 10.0528 2.21102C8.11677 2.59613 6.33837 3.5467 4.94253 4.94254C3.54669 6.33837 2.59612 8.11678 2.21101 10.0529C1.8259 11.9889 2.02355 13.9957 2.77897 15.8195C3.53439 17.6432 4.81365 19.202 6.45498 20.2987C8.09631 21.3954 10.026 21.9808 12 21.9808V20.4808C10.3227 20.4808 8.68299 19.9834 7.28834 19.0515C5.89368 18.1196 4.80668 16.7951 4.16479 15.2455C3.5229 13.6958 3.35495 11.9906 3.68219 10.3455C4.00942 8.70038 4.81713 7.18925 6.00319 6.0032C7.18925 4.81714 8.70037 4.00943 10.3455 3.68219C11.9906 3.35496 13.6958 3.52291 15.2454 4.1648C16.7951 4.80669 18.1196 5.89369 19.0515 7.28834C19.9834 8.683 20.4808 10.3227 20.4808 12H21.9808C21.9808 10.026 21.3954 8.09632 20.2987 6.45499C19.202 4.81366 17.6432 3.5344 15.8195 2.77898ZM8.64743 12C8.64743 10.1484 10.1484 8.64745 12 8.64745C13.8516 8.64745 15.3526 10.1484 15.3526 12C15.3526 13.8516 13.8516 15.3526 12 15.3526C10.1484 15.3526 8.64743 13.8516 8.64743 12ZM17.812 16.8526C16.7832 16.8526 15.902 16.221 15.535 15.3244C14.6499 16.2651 13.3936 16.8526 12 16.8526C9.32 16.8526 7.14743 14.68 7.14743 12C7.14743 9.32002 9.32 7.14745 12 7.14745C14.68 7.14745 16.8526 9.32002 16.8526 12V14.3932C16.8526 14.923 17.2821 15.3526 17.812 15.3526C19.2859 15.3526 20.4808 14.1577 20.4808 12.6838V12H21.9808V12.6838C21.9808 14.9861 20.1143 16.8526 17.812 16.8526Z" fill="white"/>'+
                '</svg>'+
            '</div>'+
            '<input type="text" placeholder="Type your email address" id="inputEmail">'+
        '</div>'+            
        '<div class="qismo-form-error qismo-email-error">Please use valid email</div>';
    } else {
        customerIdentifier = '<div class="qismo-input" style="overflow: unset;">' +
            '<div class="icon">'+
                '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">'+
                    '<path class="qismo-phone-icon" d="M6.42943 5.06718C4.57884 4.67266 2.54073 6.01341 3.09157 9.11542C4.95477 17.4571 14.7487 20.2423 17.4377 19.9837C19.5471 19.7809 20.4953 17.9796 20.8766 16.9908C21.3029 15.8852 20.6543 14.6695 18.464 14.0281C16.537 13.4637 15.9283 15.3369 16.0293 16.3923C10.9263 16.4569 8.1915 12.3527 7.46203 10.2928C9.92449 7.6273 8.3421 5.47492 6.42943 5.06718Z" stroke-width="1.5" stroke-linejoin="round"/>'+
                '</svg>'+
            '</div>'+
            '<input type="tel" id="inputPhone" placeholder="Type phone number">' +
        '</div>' +
        '<div class="qismo-form-error qismo-email-error">Please use valid phone number</div>';
    }

    var chatForm = '<div class="qcw-cs-container">' +
        '<div class="qcw-cs-wrapper">' +
            '<span class="qcw-cs-close"><img src="https://s3-ap-southeast-1.amazonaws.com/qiscus-sdk/public/qismo/img/close-circle.svg"></span>' +
            '<div class="qcw-cs-box-form">' +
                '<div class="qismo-login-form__header">'+
                    '<h3>' + greet + '</h3>' +
                    '<p>Please fill the details below before chatting with us</p>' +
                '</div>' +
                '<form class="qismo-login-form__body">' +
                    '<div class="qismo-input">' +
                        '<div class="icon">' +
                            '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">'+
                                '<mask id="path-1-inside-1" fill="white">'+
                                    '<path d="M14 15C16.2397 13.9985 16.835 10.4131 16.835 7.74292C16.835 4.57129 15.1025 2 12.0002 2C8.89771 2 7.16528 4.57129 7.16528 7.74292C7.16528 10.4131 7.7605 13.9983 10 15C10 15.5 10 16 9.5 16.1299C9.5 16.1299 6.12354 16.3945 4.33984 18.2183C3.07837 19.5078 3 22 3 22H21C21 22 20.9216 19.5078 19.6602 18.2183C17.8765 16.3945 14.5 16.1299 14.5 16.1299C14 16 14 15.5 14 15Z"/>'+
                                '</mask>'+
                                '<path class="qismo-contact-icon" d="M14 15L13.3877 13.6307C12.8477 13.8721 12.5 14.4084 12.5 15H14ZM10 15H11.5C11.5 14.4085 11.1524 13.8722 10.6125 13.6307L10 15ZM9.5 16.1299L9.61721 17.6253L9.74909 17.615L9.87713 17.5817L9.5 16.1299ZM4.33984 18.2183L5.41211 19.2672L5.41221 19.2671L4.33984 18.2183ZM3 22L1.50074 21.9529L1.45209 23.5H3V22ZM21 22V23.5H22.5479L22.4993 21.9529L21 22ZM19.6602 18.2183L18.5878 19.2671L18.5879 19.2672L19.6602 18.2183ZM14.5 16.1299L14.1229 17.5817L14.2509 17.615L14.3828 17.6253L14.5 16.1299ZM15.335 7.74292C15.335 8.98868 15.1937 10.3865 14.8272 11.5448C14.448 12.7435 13.9272 13.3894 13.3877 13.6307L14.6123 16.3693C16.3126 15.6091 17.2092 13.9615 17.6875 12.4497C18.1786 10.8973 18.335 9.16732 18.335 7.74292H15.335ZM12.0002 3.5C13.0907 3.5 13.8663 3.93134 14.4039 4.61185C14.9703 5.32897 15.335 6.4133 15.335 7.74292H18.335C18.335 5.90091 17.8334 4.11378 16.7581 2.75235C15.6538 1.35431 14.0121 0.5 12.0002 0.5V3.5ZM8.66528 7.74292C8.66528 6.4133 9.02995 5.32898 9.59639 4.61187C10.1339 3.93137 10.9096 3.5 12.0002 3.5V0.5C9.98831 0.5 8.34655 1.35427 7.24223 2.75232C6.16683 4.11377 5.66528 5.90091 5.66528 7.74292H8.66528ZM10.6125 13.6307C10.073 13.3894 9.55219 12.7434 9.17297 11.5447C8.80656 10.3864 8.66528 8.98868 8.66528 7.74292H5.66528C5.66528 9.16733 5.82161 10.8972 6.31268 12.4496C6.79095 13.9614 7.68749 15.6088 9.38754 16.3693L10.6125 13.6307ZM8.5 15C8.5 15.1349 8.49943 15.2096 8.4954 15.2711C8.49141 15.3321 8.48705 15.3173 8.50346 15.2638C8.52223 15.2026 8.57584 15.0661 8.70904 14.9279C8.85039 14.7813 9.00908 14.7076 9.12287 14.6781L9.87713 17.5817C10.2409 17.4872 10.5871 17.3024 10.8691 17.0098C11.1429 16.7257 11.2903 16.4086 11.3715 16.1437C11.5134 15.6811 11.5 15.1838 11.5 15H8.5ZM9.5 16.1299C9.38279 14.6345 9.38241 14.6345 9.38203 14.6345C9.38188 14.6345 9.38148 14.6346 9.38118 14.6346C9.3806 14.6346 9.37995 14.6347 9.37926 14.6347C9.37788 14.6349 9.37628 14.635 9.37448 14.6351C9.37088 14.6354 9.36645 14.6358 9.36121 14.6363C9.35073 14.6372 9.33701 14.6384 9.3202 14.64C9.2866 14.6432 9.2406 14.6478 9.18343 14.6543C9.06923 14.6671 8.90977 14.6873 8.71513 14.7174C8.32756 14.7774 7.79147 14.8784 7.19021 15.0441C6.03144 15.3635 4.43566 15.975 3.26748 17.1694L5.41221 19.2671C6.02772 18.6378 7.01202 18.2051 7.9874 17.9362C8.45322 17.8078 8.87273 17.7287 9.17399 17.6821C9.32376 17.6589 9.44202 17.6441 9.51943 17.6354C9.55808 17.631 9.58636 17.6282 9.60309 17.6266C9.61145 17.6258 9.61691 17.6253 9.61931 17.6251C9.62052 17.625 9.62096 17.625 9.62061 17.625C9.62044 17.625 9.62007 17.6251 9.61951 17.6251C9.61922 17.6251 9.61889 17.6252 9.61851 17.6252C9.61832 17.6252 9.61799 17.6252 9.6179 17.6252C9.61756 17.6253 9.61721 17.6253 9.5 16.1299ZM3.26758 17.1693C2.34332 18.1142 1.93079 19.3904 1.73378 20.262C1.62947 20.7234 1.57207 21.1345 1.54041 21.4314C1.52448 21.5808 1.51481 21.7038 1.50901 21.7928C1.5061 21.8374 1.50416 21.8736 1.50288 21.9005C1.50224 21.914 1.50176 21.9252 1.50142 21.9339C1.50125 21.9383 1.50111 21.9421 1.501 21.9452C1.50094 21.9468 1.50089 21.9482 1.50085 21.9495C1.50083 21.9502 1.50081 21.9507 1.50079 21.9513C1.50078 21.9516 1.50077 21.952 1.50076 21.9521C1.50075 21.9525 1.50074 21.9529 3 22C4.49926 22.0471 4.49925 22.0475 4.49924 22.0478C4.49923 22.0479 4.49922 22.0483 4.49922 22.0485C4.4992 22.0489 4.49919 22.0492 4.49918 22.0496C4.49916 22.0502 4.49914 22.0508 4.49913 22.0511C4.4991 22.0519 4.49909 22.0521 4.49911 22.0517C4.49914 22.0509 4.49926 22.048 4.4995 22.0429C4.49998 22.0327 4.50095 22.0141 4.50265 21.988C4.50607 21.9356 4.51237 21.8538 4.5235 21.7495C4.54596 21.5388 4.58699 21.2462 4.65995 20.9234C4.8175 20.2265 5.07489 19.6119 5.41211 19.2672L3.26758 17.1693ZM3 23.5H21V20.5H3V23.5ZM21 22C22.4993 21.9529 22.4992 21.9525 22.4992 21.9521C22.4992 21.952 22.4992 21.9516 22.4992 21.9513C22.4992 21.9507 22.4992 21.9502 22.4992 21.9495C22.4991 21.9482 22.4991 21.9468 22.499 21.9452C22.4989 21.9421 22.4988 21.9383 22.4986 21.9339C22.4982 21.9252 22.4978 21.914 22.4971 21.9005C22.4958 21.8736 22.4939 21.8374 22.491 21.7928C22.4852 21.7038 22.4755 21.5808 22.4596 21.4314C22.4279 21.1345 22.3705 20.7234 22.2662 20.262C22.0692 19.3904 21.6567 18.1142 20.7324 17.1693L18.5879 19.2672C18.9251 19.6119 19.1825 20.2265 19.34 20.9234C19.413 21.2462 19.454 21.5388 19.4765 21.7495C19.4876 21.8538 19.4939 21.9356 19.4973 21.988C19.499 22.0141 19.5 22.0327 19.5005 22.0429C19.5007 22.048 19.5009 22.0509 19.5009 22.0517C19.5009 22.0521 19.5009 22.0519 19.5009 22.0511C19.5009 22.0508 19.5008 22.0502 19.5008 22.0496C19.5008 22.0492 19.5008 22.0489 19.5008 22.0485C19.5008 22.0483 19.5008 22.0479 19.5008 22.0478C19.5008 22.0475 19.5007 22.0471 21 22ZM20.7325 17.1694C19.5643 15.975 17.9686 15.3635 16.8098 15.0441C16.2085 14.8784 15.6724 14.7774 15.2849 14.7174C15.0902 14.6873 14.9308 14.6671 14.8166 14.6543C14.7594 14.6478 14.7134 14.6432 14.6798 14.64C14.663 14.6384 14.6493 14.6372 14.6388 14.6363C14.6336 14.6358 14.6291 14.6354 14.6255 14.6351C14.6237 14.635 14.6221 14.6349 14.6207 14.6347C14.62 14.6347 14.6194 14.6346 14.6188 14.6346C14.6185 14.6346 14.6181 14.6345 14.618 14.6345C14.6176 14.6345 14.6172 14.6345 14.5 16.1299C14.3828 17.6253 14.3824 17.6253 14.3821 17.6252C14.382 17.6252 14.3817 17.6252 14.3815 17.6252C14.3811 17.6252 14.3808 17.6251 14.3805 17.6251C14.3799 17.6251 14.3796 17.625 14.3794 17.625C14.379 17.625 14.3795 17.625 14.3807 17.6251C14.3831 17.6253 14.3886 17.6258 14.3969 17.6266C14.4136 17.6282 14.4419 17.631 14.4806 17.6354C14.558 17.6441 14.6762 17.6589 14.826 17.6821C15.1273 17.7287 15.5468 17.8078 16.0126 17.9362C16.988 18.2051 17.9723 18.6378 18.5878 19.2671L20.7325 17.1694ZM14.8771 14.6781C14.9909 14.7076 15.1496 14.7813 15.291 14.9279C15.4242 15.0661 15.4778 15.2026 15.4965 15.2638C15.513 15.3173 15.5086 15.3321 15.5046 15.2711C15.5006 15.2096 15.5 15.1349 15.5 15H12.5C12.5 15.1838 12.4866 15.6811 12.6285 16.1437C12.7097 16.4086 12.8571 16.7257 13.1309 17.0098C13.4129 17.3024 13.7591 17.4872 14.1229 17.5817L14.8771 14.6781Z" fill="white" mask="url(#path-1-inside-1)"/>'+
                            '</svg>'+
                        '</div>' +
                        '<input type="text" placeholder="Type your name" id="inputname">'+
                    '</div>' +
                    '<div class="qismo-form-error qismo-name-error">Please provide display name</div>' +
                    customerIdentifier +
                    '<button name="submitform" type="submit" class="qcw-cs-submit-form qismo-login-btn">Start Chatting</button>' +
                '</form>' +
                '<div class="qismo-copyright">Powered by <a href="https://www.qiscus.com" target="_blank">Qiscus</a></div>' +
            '</div>' +
        '</div>' +
    '</div>';
    self.$('body').insertAdjacentHTML('afterbegin', chatForm);
    self.renderQismoTriggerButton();
    if (customerIdentifierType == "phone") {        
        var input = self.$("#inputPhone");
        var iti = intlTelInput(input, {
            initialCountry: "id",
            separateDialCode: true,
        });
    }
    if(qismoConfig.openAtStart && !qismoConfig.welcomeMessageStatus && !qismoConfig.attentionGrabberStatus){
        self.loginFormOpened = true;
        self.$('.qcw-cs-trigger-button').click()
    }

    self.addEvent(self.$('.qcw-cs-wrapper form'), 'submit', function (e) {
        e.preventDefault();
        var _self = self.$('.qcw-cs-wrapper form'),
            submitBtn = self.$('button[name="submitform"]'),
            randomKey = Date.now(),
            customerIdentifierType = qismoConfig.customerIdentifierInputType || self.defaultConfig.customerIdentifierInputType;
        
        if (customerIdentifierType == "phone") {
            var countryCode = iti.s.dialCode,
                inputPhone = self.$("#inputPhone").value,
                numbers = /^[0-9]+$/;
            
            inputPhone = inputPhone.charAt(0) == 0 ? inputPhone.substr(1) : inputPhone;
            if (!inputPhone || !inputPhone.match(numbers)) {
                self.toggleClass(self.$('#inputPhone').parentElement.parentElement, 'qismo-input-error');
                return self.toggleClass(self.$('.qismo-form-error.qismo-email-error'), 'qismo-form-error--visible');
            }
            var phoneNumber = countryCode + inputPhone;
        }
        
        var userData = {
            user_id: customerIdentifierType == "email" ? self.$('#inputEmail').value.toLowerCase() : phoneNumber,
            user_name: self.$('#inputname').value,
        }

        self.toggleClass(self.$('.qismo-input-error'), 'qismo-input-error');
        self.toggleClass(self.$('.qismo-form-error--visible'), 'qismo-form-error--visible');

        if (customerIdentifierType == "email" && !self.ValidateEmail()) return false;
        if (!userData.user_name) {
            self.toggleClass(self.$('#inputname').parentElement, 'qismo-input-error');
            return self.toggleClass(self.$('.qismo-form-error.qismo-name-error'), 'qismo-form-error--visible');
        }

        // callback, if you want add extra action when user hit submit button at form welcome
        var afterFormValidation = self.defaultConfig.callbackFunction.afterFormValidation;
        if(qismoConfig.callbackFunction && qismoConfig.callbackFunction.afterFormValidation){
            afterFormValidation = qismoConfig.callbackFunction.afterFormValidation;
        }

        if(typeof afterFormValidation == "function"){
            afterFormValidation(userData);
        }

        // submitBtn.attr('type', 'button')
        submitBtn.setAttribute('disabled', 'true')
        submitBtn.innerText = 'Loading...';
        newUser = true
        localStorage.setItem('qismo-widget', JSON.stringify(userData))
        // initQiscusWidget(userData.user_id, userData.user_name, userData.user_name, newUser)
        self.initQiscusWidget(userData,true);
    });
}

//======= UTILITIES =========//
Qismo.prototype.createNode = function(el, content, attr) {
    var node = document.createElement(el);
    if(content) node.appendChild(document.createTextNode(content));
    if(attr) {
        var nodeAttr = '';
        Object.keys(attr).forEach(function(a) {
            nodeAttr = document.createAttribute(a);
            nodeAttr.value = attr[a];
            node.setAttributeNode(nodeAttr);
        })
    }
    return node;
}

Qismo.prototype.$$ = function $$(el) { return document.querySelectorAll(el); }
Qismo.prototype.$ = function $(el) { return document.querySelector(el); }
Qismo.prototype.removeClass = function(el, classname) {
    if(el) el.classList.remove(classname);
}
Qismo.prototype.toggleClass = function(el, className) {
    if(!el) return false;
    if (el.classList) {
        el.classList.toggle(className);
    } else {
        var classes = el.className.split(' ');
        var existingIndex = classes.indexOf(className);

        if (existingIndex >= 0)
            classes.splice(existingIndex, 1);
        else
            classes.push(className);

        el.className = classes.join(' ');
    }
}
Qismo.prototype.fadeIn = function(el) {
    if(!el) return;
    var transformValue = 15;
    el.style.opacity = 0;
    el.style.transform = 'translateY(15px)';

    var last = +new Date();
    var tick = function() {
        el.style.opacity = +el.style.opacity + (new Date() - last) / 400;
        transformValue = transformValue - 1;
        if(transformValue < 15) {
        el.style.transform = 'translateY('+transformValue+'px)';
        }
        if(transformValue <= 0 || el.style.opacity >= 1) {
        el.style.transform = 'none';
        el.style.opacity = 1;
        }
        last = +new Date();

        if (+el.style.opacity < 1) {
        (window.requestAnimationFrame && requestAnimationFrame(tick)) || setTimeout(tick, 16);
        }
    };

    tick();
}
Qismo.prototype.fadeOut = function(el, callback) {
    if(!el) return;
    var transformValue = 0;
    el.style.opacity = 1;
    el.style.transform = 'translateY(0px)';

    var last = +new Date();
    var tick = function() {
        el.style.opacity = +el.style.opacity - (new Date() - last) / 400;
        transformValue = transformValue + 1;
        el.style.transform = 'translateY('+transformValue+'px)';
        last = +new Date();

        if (+el.style.opacity > 0) {
        (window.requestAnimationFrame && requestAnimationFrame(tick)) || setTimeout(tick, 16);
        }

        if(el.style.opacity <= 0) {
            if(callback) callback();
        }
    };

    tick();
}
Qismo.prototype.removeElement = function(el) {
    if(el) el.parentNode.removeChild(el);
}
Qismo.prototype.addEvent = function(el, type, fn) {
    var self = this;
    var filter = function(el, type, fn) {
        for ( var i = 0, len = el.length; i < len; i++ ) {
            self.addEvent(el[i], type, fn);
        }
    };

    if ( el && el.nodeName || el === window ) {
        el.addEventListener(type, fn, false);
    } else if (el && el.length) {
        filter(el, type, fn);
    }
}


/**
 *
 * @param {string} type  -- 'POST' | 'GET'
 * @param {string} url -- 'endpoint url'
 * @param {object} data -- parameters that need to be sent
 * @param {function} successFn -- function to be called when success
 * @param {function} failFn -- function to be called when failed
 */
Qismo.prototype.$ajax = function (opts) {
    var request = new XMLHttpRequest();
    var formData = '';

    return new Promise(function (resolve, reject) {
        request.onload = function() {
            if (this.status >= 200 && this.status < 400) {
                resolve(opts.successFn(JSON.parse(this.response)));
            } else {
                reject(opts.failFn(JSON.parse(this.response)));
            }
        };
        request.onerror = function() {
            reject(opts.failFn());
        };
        request.open(opts.type || 'GET', opts.url, true);
        if(opts.type == 'POST') {
            request.setRequestHeader('Content-type','application/json; charset=utf-8');
            if(opts.data) {
                formData = JSON.stringify(opts.data);
            }
        }

        request.send(formData || null);
    });
}