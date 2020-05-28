const {promisify} = require('util');
const jsonWebToken = require('jsonwebtoken');

const User = require('../models/User');
const catchRequest = require('../utils/catchRequest');
const AppError = require('../utils/AppError');

exports.protect = catchRequest(async (req, res, next) => {
    let token;
    if (req.headers.authorization) {
        token = req.headers.authorization;
    } else if (req.cookies.jwt) {
        token = req.cookies.jwt
    }
    if (!token) {
        throw new AppError('You are not logged in.', 401);
    }
    const decodedToken = await promisify(jsonWebToken.verify)(token, process.env.JSON_WEB_TOKEN_SECRET);
    const user = await User.findById(decodedToken.id);
    if (!user) {
        throw new AppError(
            'The user belong to the token that no longer exists',
            401
        );
    }
    req.user = user;
    next();
});

exports.restrictTo = (...rotes) => {
    return catchRequest(
        async (req, res, next) => {
            if (rotes.includes(req.user.rote)) {
                return next();
            } else if (rotes.includes('selfUser')) {
                req.password = undefined;
                return next();
            }
            throw new AppError('You don\'t have permission to do that', 403);
        }
    );
};

const signToken = ({_id}) => {
    return jsonWebToken.sign(
        {
            id: _id
        },
        process.env.JSON_WEB_TOKEN_SECRET,
        {
            expiresIn: process.env.JSON_WEB_TOKEN_TIME
        }
    );
};

const sendToken = (user, statusCode, res) => {
    const token = signToken(user);
    const cookieOptions = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
        ),
        httpOnly: true
    };
    if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

    res.cookie('jwt', token, cookieOptions);

    user.password = undefined;

    res.cookie('jwt', token, {
        httpOnly: true
    });

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user
        }
    });
};

exports.logOut = (req, res) => {
    res.clearCookie('jwt');
    res.status(200).json({status:'success'})
};

exports.signIn = catchRequest(async (req, res) => {
    const {username, password} = req.body;
    if (
        !username ||
        !password ||
        password.length < 8 ||
        password.length > 100) {
        throw new AppError('request body should have valid username and password.', 400);
    }
    const user = await User.findOne({username}).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
        throw new AppError('Incorrect username or password', 401);
    }

    sendToken(user, 200, res);
});

exports.isSignedIn = catchRequest(
    async (req, res) => {
        res.status(200).json({
            status: 'success',
            data: {
                user: req.user
            }
        });
    }
);