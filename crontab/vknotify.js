/**
 * Крон для рассылки нотификаций в ВК
 *
 * @author aosipov
 */

var VkDriver = require('../api/services/VkDriver');

var FETCH_LIMIT = 20000;

var MESSAGE = 'Прямо сейчас более {{count}} игроков хотят с вами сыграть!';

var NOTIFY_CHUNK_SIZE = 100;

var USERS_CHUNK_SIZE = 300;

var VK_API_DELAY = 3000;

var kue = require('kue')
    , queue = kue.createQueue();

var _ = require('lodash');

var moment = require('moment');

module.exports = {

    lastApiCallTimestamp: null,

    run: function() {
        // на проде не пускаем таски из-за кластеров
        if (process.env.NODE_ENV == 'production') {
            return;
        }
        var count = Math.floor(Math.random() * 500) + 100,
            t = this;
        this.lastApiCallTimestamp = null;

        sails.log.info('VkNotify cron started!');

        MESSAGE = MESSAGE.replace('{{count}}', count + '');
        //очередь выборки онайлнов
        queue.process('getOnlines', function (job, done) {
            //var advertOption = job.data.ad;
            var timestamp = moment().format('YYYY.MM.DD hh:m:s');
            sails.log.warn('VkNotify getOnlines task cb ts: ', timestamp);
            if (job.data && job.data.users) {
                t.getOnlineUsers(job.data.users, done);
            } else {
                done();
            }
        });

        //очередь рассылки нотификации
        queue.process('sendNotifyTask', function (job, done) {
            var timestamp = moment().format('YYYY.MM.DD hh:m:s');
            sails.log.warn('VkNotify sendNotifyTask cb ts: ', timestamp);
            if (job.data && job.data.params) {
                t.sendNotify(job.data.params, done);
            } else {
                done();
            }
        });
        //очередь рассылки нотификации всем подряд
        queue.process('sendNotify', function (job, done) {
            var timestamp = moment().format('YYYY.MM.DD hh:m:s');
            if (job.data && job.data.users) {
                t.sendNotify({user_ids: job.data.users, message: MESSAGE}, done);
            } else {
                done();
            }
        });

        this.fetchIds();
        //this.fetchIdsAndSend();
    },

    getNextApiDelay: function() {
        if (!this.lastApiCallTimestamp) {
            this.lastApiCallTimestamp = new Date();
        }

        this.lastApiCallTimestamp = new Date(this.lastApiCallTimestamp.getTime() + VK_API_DELAY);
        var timestamp = moment(this.lastApiCallTimestamp).format('YYYY.MM.DD hh:m:s');
        sails.log.warn('VkNotify Next API ts:', timestamp);
        return this.lastApiCallTimestamp;
    },

    fetchIds: function(lastId) {
        var log = sails.log,
            where = '',
            t = this;

        if (lastId) {
            where = {
                where: {
                    id: {
                        '>': lastId
                    },
                    limit: FETCH_LIMIT
                }
            };
        } else {
            //первый проход
            where = {
                limit: FETCH_LIMIT
            }
        }

        User.find(where)
            .then(function(users) {
                if (users && _.isArray(users) && _.size(users)) {
                    log.info('fethed users size: ', _.size(users));
                    var ids = _.invoke(users, 'getSocialId');
                    if (_.isArray(ids) && _.size(ids)) {
                        //все ок чего-то забрали
                        log.info('fethed social_ids: ', _.size(ids), 'fetch limit:', FETCH_LIMIT);
                        var lastId = _.last(users).id;
                        //шлем спам)
                        var chunkBy1000 = _.chunk(ids, USERS_CHUNK_SIZE);
                        for (var i = 0; i < _.size(chunkBy1000); i++) {
                            //создаем джобы с таймаутом
                            sails.log.info('create queue getOnlines');
                            queue.create('getOnlines', {
                                users: chunkBy1000[i]
                            }).delay(t.getNextApiDelay())
                                .priority('high')
                                .removeOnComplete( true )
                                .save();
                        }
                        t.fetchIds(lastId);
                    } else {
                        log.info('VkNotify complete!');
                    }
                } else {
                    log.info('VkNotify complete!');
                }
            })
            .catch(function(err) {
                log.error('VkNotify, fetch error!\n Err:', err);
            });
    },

    fetchIdsAndSend: function(lastId) {
        var log = sails.log,
            where = '',
            t = this;

        if (lastId) {
            where = {
                where: {
                    id: {
                        '>': lastId
                    },
                    limit: FETCH_LIMIT
                }
            };
        } else {
            //первый проход
            where = {
                limit: FETCH_LIMIT
            }
        }

        User.find(where)
            .then(function(users) {
                if (users && _.isArray(users) && _.size(users)) {
                    log.info('fethed users size: ', _.size(users));
                    var ids = _.invoke(users, 'getSocialId');
                    if (_.isArray(ids) && _.size(ids)) {
                        //все ок чего-то забрали
                        log.info('fethed social_ids: ', _.size(ids), 'fetch limit:', FETCH_LIMIT);
                        var lastId = _.last(users).id;
                        //шлем спам)
                        var chunkBy1000 = _.chunk(ids, NOTIFY_CHUNK_SIZE);
                        for (var i = 0; i < _.size(chunkBy1000); i++) {
                            //создаем джобы с таймаутом
                            sails.log.info('create queue send.Notify, users:', chunkBy1000[i]);
                            queue.create('sendNotify', {
                                users: chunkBy1000[i]
                            }).delay(t.getNextApiDelay())
                                .priority('high')
                                .removeOnComplete( true )
                                .save();
                        }
                        t.fetchIdsAndSend(lastId);
                    } else {
                        log.info('VkNotify complete!');
                    }
                } else {
                    log.info('VkNotify complete!');
                }
            })
            .catch(function(err) {
                log.error('VkNotify, fetch error!\n Err:', err);
            });
    },

    getOnlineUsers: function(chunk, done) {
        var config = sails.config.app.vk.prod,
            vk = VkDriver(config.app_id, config.secret),
            log = sails.log,
            t = this;
        log.info('getOnlineUsers size of in: ', _.size(chunk));
        vk('users.get', {fields: 'online', user_ids: chunk.join(',')}, function(res) {
            if (res && !res.error_code) {
                var onlines = _.filter(res, function(user) {
                    return user.online == 1;
                });
                t.createOnlineNotificationChunks(onlines);
            } else {
                log.warn('user.get err: \n', res);
            }
            done();
        });
    },
    /**
     * Рассылаем нотификацию только онайланам
     * @param users
     */
    createOnlineNotificationChunks: function(users) {
        //разбиваем на чанки
        var chunk = _.chunk(users, NOTIFY_CHUNK_SIZE),
            log = sails.log;
        for (var i = 0; i < _.size(chunk); i++) {
            var params = {
                user_ids: _.pluck(chunk[i], 'id').join(','),
                message: MESSAGE
            };
            if (params.user_ids) {
                queue.create('sendNotifyTask', {
                    params: params
                }).delay(this.getNextApiDelay())
                    .priority('high')
                    .removeOnComplete( true )
                    .save();
            } else {
                log.warn('Send notify skipped, no user_ids passed', params.user_ids);
            }
        }
    },

    /**
     * Рассылка нотификации
     * @param params - чанк юзеров (200)
     */
    sendNotify: function(params, done) {
        var config = sails.config.app.vk.prod,
            vk = VkDriver(config.app_id, config.secret),
            log = sails.log;
        if (params) {
            log.info('secure.sendNotification user_ids to send:', params);
            vk('secure.sendNotification', params, function(res) {
                if (res) {
                    log.info('VkNotify RESPONSE', res);
                    if (res.error_code) {
                        log.warn('VkNotify vk api error \n Err:', res);
                    } else {
                        try {
                            log.info('VkNotify sent ids count:', _.size(res.split(',')));
                        } catch (e) {
                            //тут бывают эроры, потому делаем так
                        }
                    }
                }
                done();
            });
        }
    }
};

