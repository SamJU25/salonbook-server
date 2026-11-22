import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createServiceSchema,
  listServicesQuerySchema,
  updateServiceSchema,
} from "../src/validators/service.validator.js";
import { isValidObjectId } from "../src/utils/objectId.js";
import { escapeRegex } from "../src/utils/regex.js";

describe("service validators & utilities", () => {
  it("rejects non-positive price or duration", () => {
    const subMinimumPrice = createServiceSchema.safeParse({
      serviceName: "Test Cut",
      category: "Haircut & Styling",
      description: "Detailed haircut service for testing.",
      price: 0.4,
      duration: 45,
      image: "https://i.ibb.co/example/cut.png",
    });
    assert.equal(subMinimumPrice.success, false);

    const zeroPrice = createServiceSchema.safeParse({
      serviceName: "Test Cut",
      category: "Haircut & Styling",
      description: "Detailed haircut service for testing.",
      price: 0,
      duration: 45,
      image: "https://i.ibb.co/example/cut.png",
    });
    assert.equal(zeroPrice.success, false);

    const negativeDuration = createServiceSchema.safeParse({
      serviceName: "Test Cut",
      category: "Haircut & Styling",
      description: "Detailed haircut service for testing.",
      price: 50,
      duration: -15,
      image: "https://i.ibb.co/example/cut.png",
    });
    assert.equal(negativeDuration.success, false);
  });

  it("defaults service status to active and rejects empty updates", () => {
    const valid = createServiceSchema.parse({
      serviceName: "Botanical Facial",
      category: "Facial & Skincare",
      description: "Relaxing organic facial treatment.",
      price: 90,
      duration: 60,
      image: "https://i.ibb.co/example/facial.png",
    });
    assert.equal(valid.status, "active");

    const emptyPatch = updateServiceSchema.safeParse({});
    assert.equal(emptyPatch.success, false);
  });

  it("validates query sorting and ObjectId / regex helpers", () => {
    const query = listServicesQuerySchema.parse({
      search: "balayage",
      sort: "price_asc",
      limit: "6",
    });
    assert.equal(query.limit, 6);
    assert.equal(query.sort, "price_asc");

    assert.equal(isValidObjectId("507f1f77bcf86cd799439011"), true);
    assert.equal(isValidObjectId("123456789012"), false); // 12-byte trap!
    assert.equal(escapeRegex("hair+spa (deluxe)"), "hair\\+spa \\(deluxe\\)");
  });
});
