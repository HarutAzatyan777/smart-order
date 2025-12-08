import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5001/swift-stack-444307-m4/us-central1/api/", // կամ քո deployed URL-ը
});

export default api;
