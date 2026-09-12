export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Method not allowed. Use POST."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Knowvia API is working."
    });

  } catch (error) {
    return res.status(500).json({
      error: "Function crashed.",
      details: error.message
    });
  }
}
