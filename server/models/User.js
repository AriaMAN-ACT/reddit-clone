const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: [true, 'A user must have a email.'],
        validate: {
            validator: value => /^\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/.test(value),
            message: ({value}) => `${value} is not a valid email.`
        },
        lowercase: true,
        unique: true
    },
    username: {
        type: String,
        required: [true, 'A user must have a username'],
        validate: {
            validator: value => /^(?=[a-zA-Z0-9._]{4,20}$)(?!.*[_.]{2})[^_.].*[^_.]$/.test(value),
            message: ({value}) => `${value} is not a valid username`
        }
    },
    usernameSlug: {
        type: String,
        unique: [true, 'Username is already taken.'],
        select: false
    },
    displayName: {
        type: String,
        maxLength: [20, 'User\'s display name\'s length must be lower than 20 or 20.'],
        minLength: [4, 'User\'s display name\'s length must be higher than 4 or 4.']
    },
    about: {
        type: String,
        maxLength: [20, 'User\'s about text\'s length must be lower than 200 or 200.'],
    },
    avatarImage: {
        type: String,
        default: 'default.jpg'
    },
    bannerImage: {
        type: String,
        default: 'default.jpg'
    },
    NSFW: {
        type: Boolean,
        default: false
    },
    private: {
        type: Boolean,
        default: false
    },
    showActivity: {
        type: Boolean,
        default: true
    },
    password: {
        type: String,
        required: [true, 'A User Must Have A password'],
        validate: {
            validator: value => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,100}$/.test(value),
            message: 'Invalid password.'
        },
        select: false
    },
    passwordChangedAt: Date,
    passwordResetToken: {
        type: String,
        select: false
    },
    passwordResetExpires: Date,
    showInSearch: {
        type: Boolean,
        default: true
    },
    TFA: {
        type: Boolean,
        default: false
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    showAdultContent: {
        type: Boolean,
        default: false
    },
    safeBrowsing: {
        type: Boolean,
        default: false
    },
    autoplayMedia: {
        type: Boolean,
        default: true
    },
    inboxNotification: {
        type: Boolean,
        default: true
    },
    inboxMarkAsRead: {
        type: Boolean,
        default: true
    },
    mentionNotification: {
        type: Boolean,
        default: true
    },
    emailNotifications: {
        type: Boolean,
        default: true
    },
    rote: {
        type: String,
        enum: {
            values: ['admin', 'user'],
            message: 'A User Must Have rote Value Set To admin Or User.'
        },
        default: 'user'
    },
    verifyEmailToken: {
        type: String,
        select: false
    },
    verifyEmailExpires: Date
});

userSchema.methods.createResetPasswordToken = function() {
    const resetToken = crypto.randomBytes(64).toString('hex');
    this.passwordResetToken =
        crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');
    this.VerifyEmailExpires = Date.now() + 600000;
    return resetToken;
};

userSchema.methods.createVerifyEmailToken = function() {
    const verifyToken = crypto.randomBytes(64).toString('hex');
    this.verifyEmailToken =
        crypto
            .createHash('sha256')
            .update(verifyToken)
            .digest('hex');
    this.verifyEmailExpires = Date.now() + 600000;
    return verifyToken;
};

userSchema.methods.correctPassword = async function(
    candidatePassword,
    userPassword
) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.isPasswordChanged = function(JWTTimeStamp) {
    if (this.passwordChangedAt) {
        if (this.passwordChangedAt.getTime() / 1000 > JWTTimeStamp) {
            return true;
        }
    }
    return false;
};

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

userSchema.pre('save', function (next) {
    this.usernameSlug = (this.username || '').toLowerCase();
    if (!this.isEmailValidated) {
        this.TFA = false;
    }
    this.rote = 'user';
    next();
});

userSchema.pre('save', function(next) {
    if (this.isModified('password') && !this.isNew) {
        this.passwordChangedAt = Date.now() - 1000;
        this.passwordResetToken = undefined;
        this.passwordResetExpires = undefined;
    }
    next();
});

userSchema.pre('save', function (next) {
    if (this.isModified('isEmailVerified') && !this.isNew) {
        this.verifyEmailToken = undefined;
        this.VerifyEmailExpires = undefined;
    }
    next();
});

userSchema.pre('findOneAndUpdate', function(next) {
    if (this._update && this._update.username) {
        this._update.usernameSlug = this._update.username.toLowerCase();
    }

    this._update.isEmailValidated = this._update.validateEmail;
    if (!this._update.isEmailValidated) {
        this._update.TFA = false;
    }
    this._update.rote = 'user';
    next()
});

userSchema.pre('findOneAndUpdate', async function(next) {
    if (this._update.password) {
        this._update.password = await bcrypt.hash(this._update.password, 12);
    }
    next();
});

const User = mongoose.model('user', userSchema);

module.exports = User;