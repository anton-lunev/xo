/**
 * http://vk.com/developers.php
 *
 * @param params
 * @param callback
 */
var VkSocialApi = function(params, callback) {
    var instance = this;

    var apiUrl = '//vk.com/js/api/xd_connection.js?2';

    params = jQuery.extend({
        width: 827
    }, params);

    var wrap = function() {
        return window[params.wrapperName];
    };

    var moduleExport = {
        // raw api object - returned from remote social network
        raw: null,

        unifyFields: {
            id: 'uid',
            socialId: 'uid',
            first_name: 'first_name',
            last_name: 'last_name',
            birthdate: 'bdate',
            nickname: 'nickname',
            online: 'online',

            photo: 'photo', // 50px
//			photo_medium: 'photo_medium', // 100px
//			photo_big: 'photo_big', // 200px
//			photo_medium_rec: 'photo_medium_rec', // 100px sq
//			photo_rec: 'photo_rec', // 50px sq

            gender: function() {
                var value = arguments.length ? arguments[0] : false;
                if (!value) {
                    return 'sex';
                }
                return value == 2 ? 'male' : 'female';
            }
        },
        // information methods
        getProfiles: function(uids, name_case, callback, errback) {
            var def = new $.Deferred();
            if (!_.isArray(uids)) {
                uids = (uids + '').split(',');
            }

            VK.api('getProfiles', {uids: uids.join(','), fields: wrap().getApiFields(params.fields), name_case: name_case}, function(data) {
                if (data.error) {
                    return def.reject(data.error);
                }
                return def.resolve(wrap().unifyProfileFields(data.response));
            });

            return def.promise();
        },
        getFriends: function() {
            var def = new $.Deferred();
            VK.api('friends.get', { uid: VK.params.viewer_id, fields: wrap().getApiFields(params.fields)}, function(data) {
                if (data.error) {
                    return def.reject(data.error);
                }
                if (data.response === null) {
                    data.response = [];
                }
                return def.resolve(wrap().unifyProfileFields(data.response));
            });
            return def.promise();
        },

        getCurrentUser: function() {
            VK.loadParams(document.location.href);
            return moduleExport.getProfiles(VK.params.viewer_id);
        },

        getAppFriends: function() {
            var def = new $.Deferred();

            VK.api('getAppFriends', function(data) {
                if (data.error) {
                    return def.reject(data.error);
                }
                if (data.response === null) {
                    data.response = [];
                }

                moduleExport.getProfiles(data.response)
                    .done(function(appFriends) {
                        return def.resolve(appFriends);
                    })
                    .fail(function(err) {
                        return def.reject(err);
                    });
            });

            return def.promise();
        },

        getAppFriendsIds: function() {
            var def = new $.Deferred();

            VK.api('getAppFriends', function(data) {
                if (data.error) {
                    return def.reject(data.error);
                }
                if (data.response === null) {
                    data.response = [];
                }

                return def.resolve(data.response);
            });

            return def.promise();
        },

        /**
         * Объект для работы с друзьями
         */
        friends: {
            /**
             * Возвращает всех друзей в формате {all, inApp, notApp}
             * @returns {*}
             */
            getAll: function() {
                var def = new $.Deferred();
                moduleExport.friends.getInApp()
                    .done(function(inApp) {
                        inApp = inApp || [];
                        moduleExport.friends.getNotApp()
                            .done(function(notApp) {
                                notApp = notApp || [];
                                def.resolve({
                                    all: _.union(inApp, notApp),
                                    inApp: inApp,
                                    notApp: notApp
                                });
                            })
                            .fail(function() {
                                def.resolve({
                                    all: [],
                                    inApp: [],
                                    notApp: []
                                });
                            });
                    })
                    .fail(function() {
                        moduleExport.friends.getNotApp().done(function(notApp) {
                            notApp = notApp || [];
                            def.resolve({
                                all: _.union([], notApp),
                                inApp: [],
                                notApp: notApp
                            });
                        });
                    });
                return def.promise();
            },

            /**
             * Список друзей в приложении
             * @returns {*}
             */
            getInApp: function() {
                return moduleExport.getAppFriends();
            },

            /**
             * Список друзей не в приложении
             * @returns {*}
             */
            getNotApp: function() {
                var def = new $.Deferred();
                moduleExport.getAppFriends()
                    .done(function(appFriends) {
                        moduleExport.getFriends()
                            .done(function(allFriends) {
                                var appIds = [],
                                    inApp = [];
                                if (_.isArray(appFriends)) {
                                    _.each(appFriends, function(v) {
                                        appIds.push(v.socialId);
                                    });
                                }
                                if (_.isArray(allFriends) && appIds.length) {
                                    inApp = _.filter(allFriends, function(v) {
                                        return _.indexOf(appIds, v.socialId) == -1;
                                    });
                                } else {
                                    inApp = allFriends;
                                }

                                def.resolve(inApp);
                            })
                            .fail(function(err) {
                                log('NotApp fail', err);
                                def.reject(err);
                            })
                    })
                    .fail(function(err) {
                        log('getApp fail: ', err);
                        def.reject(err);
                    });
                return def.promise();
            }
        },
        // utilities
        inviteFriends: function() {
            var params = arguments[0] || null;
            var callback = arguments[1] || null;
            if (typeof params == 'function') {
                callback = params;
            }

            VK.addCallback('onWindowFocus', function() {
                VK.removeCallback('onWindowFocus');
                return callback ? callback() : null;
            });
            VK.callMethod('showInviteBox');
        },

        resizeCanvas: function(params, callback) {
            VK.callMethod('resizeWindow', params.width, params.height);
            return callback ? callback() : null;
        },

        // service methods
        wallpost: function(params) {
            var def = new $.Deferred();

            params = jQuery.extend({owner_id: VK.params.viewer_id}, params);
            VK.api('wall.post', params, function(data) {
                if (data.error) {
                    return def.resolve(data.error);
                }
                if (data.response && data.response.post_id) {
                    log('wallpost success');
                }
                return def.resolve(data.response);
            });

            return def.promise();
        },
        // как это сделать правильно?
        makePayment: function(params) {
            var def = new $.Deferred();
            VK.callMethod('showOrderBox', params);

            VK.addCallback('onOrderSuccess', function(order_id) {
                log('PaymentModal complete', User.get('social_id'));
                return def.resolve(order_id);
            });

            VK.addCallback('onOrderFail', function(res) {
                log('onOrderFail');
                return def.reject(res);
            });

            VK.addCallback('onOrderCancel', function(res) {
                log('onOrderCancel');
                return def.reject(res);
            });

            VK.addCallback('onBalanceChanged', function() {
                //хз работает ли это, но можно проверить
                VK.removeCallback('onBalanceChanged');
                return def.resolve('balance');
            });

            return def.promise();
        },

        /**
         * Вернет профили друзей которых можно пригласить на дуель
         * @returns {*}
         */
        getFriendsToCall: function() {
            var def = $.Deferred();
            moduleExport.getFriendsAvailableForCall().done(function(friends) {
                if (_.isObject(friends) && friends.count && friends.items) {
                    moduleExport.getProfiles(friends.items)
                        .done(function(data) {
                            return def.resolve(data);
                        })
                        .fail(function() {
                            return def.resolve([]);
                        });
                } else {
                    return def.resolve([]);
                }
            });
            return def.promise();
        },

        /**
         * Получение списка друзей, кого можно вызвать на дуель
         * @returns {*}
         */
        getFriendsAvailableForCall: function() {
            var def = new $.Deferred();

            VK.api('friends.getAvailableForCall', {v: 5.2}, function(res) {
                if (res && res.response && res.response.count) {
                    return def.resolve(res.response);
                } else {
                    return def.resolve({});
                }
            });

            return def.promise();
        },

        /**
         * Вызов френда на дуель
         * @param params
         * @returns {*}
         */
        callFriend: function(params) {
            var def = new $.Deferred();
            if (_.isObject(params) && params.uid && params.message) {
                var callId = 'call' + params.uid;
                VK.callMethod('callUser', params.uid, callId, params.message);

                VK.addCallback('onCallAccept', function(key) {
                    def.resolve(key);
                });
                VK.addCallback('onCallReject', function(key) {
                    def.reject(key);
                });
            }

            return def.promise();
        },

        /**
         * Показываем реквест бокс
         * @param params
         * @returns {*}
         */
        showRequestBox: function(params) {
            var def = $.Deferred();
            if (_.isObject(params) && params.uid && params.message) {
                VK.callMethod('showRequestBox', params.uid, params.message, params.requestKey);

                VK.addCallback('onRequestSuccess', function() {
                    def.resolve(true);
                });
                VK.addCallback('onRequestCancel', function() {
                    def.reject(false);
                });
                VK.addCallback('onRequestFail', function() {
                    def.reject(false);
                });
            }
            return def.promise();
        }
    };

    // constructor
    jQuery.getScript(apiUrl, function() {
        VK.init(function() {
            VK.loadParams(document.location.href);
            moduleExport.raw = VK;

            // export methods
            instance.moduleExport = moduleExport;

            callback ? callback() : null;
        });
    });
};
