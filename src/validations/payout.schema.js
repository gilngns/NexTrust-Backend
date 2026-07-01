const { z } = require("zod");

const requestPayoutSchema = z.object({
  body: z.object({
    amount: z.number().positive("Jumlah pencairan harus lebih besar dari 0"),
  }),
});

module.exports = {
  requestPayoutSchema,
};
