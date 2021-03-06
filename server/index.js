const path = require('path');
const dotenv = require('dotenv');
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const next = require('next');

const userRouter = require('./routes/userRouter');
const communityRouter = require('./routes/communityRouter');
const errorController = require('./controllers/errorController');

dotenv.config({
    path: path.join(__dirname, './config.env')
});

const dev = process.env.NODE_ENV !== 'production';
const app = next({dev});
const handle = app.getRequestHandler();

app.prepare()
    .then(() => {
        const server = express();

        server.use(express.json({
            limit: '10kb'
        }));

        server.use(cookieParser());

        server.use(bodyParser.urlencoded({extended: true}));

        server.use((req, res, next) => {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
            res.header("Access-Control-Allow-Methods", "*");
            next();
        });

        server.use('/api/v1/users', userRouter);

        server.use('/api/v1/communities', communityRouter);

        server.get('*', (req, res) => {
            return handle(req, res);
        });

        server.use(errorController);

        const Port = process.env.PORT || 3000;

        server.listen(Port, err => {
            if (err) throw err;
            console.log(`> Ready on http://localhost:${Port}`);
        });

        const DB =
            process.env.DATABASE
                .replace('<password>', process.env.DATABASE_PASSWORD);

        mongoose.connect(DB, {
            useNewUrlParser: true,
            useCreateIndex: true,
            useFindAndModify: false,
            useUnifiedTopology: true
        }).then(con => {
            console.log('Connected to DB successfully.');
        });
    })
    .catch(err => {
        console.error(err.stack);
        process.exit(1);
    });