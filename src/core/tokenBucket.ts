// consume logic for token bucket algorithm ....

const tokenBucket = TokenBucket({
   capacity,
   refillRate,
   key,
   storage,
   nowFn: Date.now(),
})
// A - read stateee
const consume = async (tokens = 1) => {
   const storage = await Storage.get(tokenBucket.key); // import Storage
   if(!storage) {
      return {
         token: tokenBucket.capacity,
         lastRefill: tokenBucket.nowFn,
      }

   }
// B - compute refill
   let now = tokenBucket.nowFn();
   let elapsed = now - lastRefill < 0 ? 0 : now - lastRefill;
   let refill = elapsed * refillRate;
   let newTokens = min(capacity, tokens + refill);
   lastRefill = now;

   // C - Now decide to allow or block
   if (newTokens >= tokens) {
      newTokens -= tokens;
      tokens = newTokens;
      lastRefill = now;

      return {
         allowed: true,
         remaining: Math.floor(newTokens),
         retryAfterMs: 0,
      }
   } else {
      let needed = tokens - newTokens;
      let retryAfterMs = Math.ceil(needed / refillRate);
      lastRefill = now;

      return {
         allowed: false,
         remaining: Math.floor(newTokens),
         retryAfterMs
      }
   }
}

