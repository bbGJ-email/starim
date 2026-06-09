const errorHandler = (err, req, res, next) => {
  console.error('错误:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      ok: false,
      msg: '数据验证失败',
      errors: err.errors
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      ok: false,
      msg: '未授权访问'
    });
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      ok: false,
      msg: '数据已存在'
    });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      ok: false,
      msg: '文件大小超出限制'
    });
  }

  res.status(err.status || 500).json({
    ok: false,
    msg: err.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

const notFoundHandler = (req, res) => {
  res.status(404).json({
    ok: false,
    msg: '请求的资源不存在'
  });
};

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};
