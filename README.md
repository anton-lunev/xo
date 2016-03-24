# XO

a [Sails](http://sailsjs.org) application

# Установка

    1. sudo apt-get install curl
    2. sudo curl -sL https://deb.nodesource.com/setup | bash -
    3. Ставим nvm, затем из него ставим последнюю ноду 11 версии
    4. http://serverfault.com/questions/597756/how-to-upgrade-nginx-from-1-2-to-1-6-on-debian-7
    5. sudo apt-get install git
    6. ssh-keygen -t rsa -C "andrey.ossipov@gmail.com"
    7. git clone && sudo npm install
    8. http://docs.mongodb.org/manual/tutorial/install-mongodb-on-debian/
    9. apt-get install screen (http://boombick.org/blog/posts/22) Ctrl+a d. screen -r
    10. redis - https://www.digitalocean.com/community/tutorials/how-to-install-and-use-redis,  http://redis.io/topics/quickstart
    11. npm install connect-redis@1.4.5
    12. ставим pm2 https://github.com/Unitech/pm2 https://github.com/Unitech/PM2/blob/development/ADVANCED_README.md#a890 (pm2 restart watch.json && pm2 logs)
    13. ставим pm2 как сервис sudo env PATH=$PATH:/usr/local/bin pm2 startup -u [user_name]
    14. Ставим мускуль sudo apt-get install mysql-server, затем запускаем mysql_secure_installation
    15. npm install
    16. pm2 startup ubuntu && pm2 save (что бы после рестарта сервака все поднялось)
    17. Шедулер работает почему-то только из мастера, поэтому npm install http://github.com/Automattic/kue/tarball/master

# Запуск
    pm2 start dev.json -- для дева
    pm2 start prod.json -- для прода
    pm2 logs
    pm2 mon

# Кроны ака таски
    1. Как удалить залипшие кроны в консоле надо сделать redis-cli KEYS "q:job:*" | xargs redis-cli DEL
    2. Как добавить новую таску
       1. Создаем расписание тут crontab.js
       2. Логика таски запихивается в каталог /crontab/you_task.js (например, vknotify.js)
