exports.paginate = (page = 1, limit = 20) => {
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;
  return { skip, limit: limitNum };
};

exports.paginationMetadata = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};

const paginate = (query, { page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;
  return query.skip(skip).limit(limit);
};

const getPaginationMeta = (total, page, limit) => {
  return {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
};

module.exports = { paginate, getPaginationMeta };