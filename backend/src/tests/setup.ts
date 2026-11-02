process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.TEST_MONGO_URI ?? 'mongodb://127.0.0.1:27017/dali_test';
process.env.JWT_ACCESS_SECRET = 'test-secret-test-secret-test-secret-123';
process.env.BCRYPT_ROUNDS = '4';
process.env.UPLOAD_DIR = 'uploads-test';
