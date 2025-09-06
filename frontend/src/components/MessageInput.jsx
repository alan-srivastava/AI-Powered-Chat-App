import { Loader2, Paperclip, Send, X } from "lucide-react";
import React, { useState, useRef } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { useAppData } from "../context/AppContext";

const MessageInput = ({
  selectedUser,
  message,
  setMessage,
  handleMessageSend,
}) => {
  const [imageFile, setImageFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [currentSuggestion, setCurrentSuggestion] = useState("");
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const { chat_service } = useAppData();
  const inputRef = useRef(null);
  const debounceTimer = useRef(null);

  const fetchSuggestions = async (partialMessage) => {
    // Extract the current word being typed (from last space to end)
    const words = partialMessage.split(' ');
    const currentWord = words[words.length - 1];

    if (currentWord.length < 3) {
      setSuggestions([]);
      setCurrentSuggestion("");
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const token = Cookies.get("token") || "";
      if (!token) {
        throw new Error("No auth token found");
      }
      const response = await axios.post(
        `${chat_service}/api/v1/suggestions`,
        { partialMessage: currentWord },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const suggestionList = response.data.suggestions || [];
      setSuggestions(suggestionList);

      // Create full message suggestion by replacing the current word
      if (suggestionList[0]) {
        const fullMessage = partialMessage.replace(/\w+$/, suggestionList[0]);
        setCurrentSuggestion(fullMessage);
      } else {
        setCurrentSuggestion("");
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setSuggestions([]);
      setCurrentSuggestion("");
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    // Clear suggestion if user types something that doesn't match
    if (currentSuggestion && !currentSuggestion.toLowerCase().startsWith(value.toLowerCase())) {
      setCurrentSuggestion("");
      setSuggestions([]);
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 500);
  };

  const handleKeyDown = (e) => {
    if ((e.key === "Tab" || e.key === "ArrowRight") && currentSuggestion && currentSuggestion !== message) {
      e.preventDefault();
      setMessage(currentSuggestion);
      setCurrentSuggestion("");
      setSuggestions([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() && !imageFile) return;

    setIsUploading(true);
    await handleMessageSend(e, imageFile);
    setImageFile(null);
    setIsUploading(false);
    setCurrentSuggestion("");
    setSuggestions([]);
  };

  if (!selectedUser) return null;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 border-t border-gray-700 pt-2"
    >
      {imageFile && (
        <div className="relative w-fit">
          <img
            src={URL.createObjectURL(imageFile)}
            alt="preview"
            className="w-24 h-24 object-cover rounded-lg border border-gray-600"
          />
          <button
            type="button"
            className="absolute -top-2 -right-2 bg-black rounded-full p-1"
            onClick={() => setImageFile(null)}
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <label className="cursor-pointer bg-gray-700 hover:bg-gray-600 rounded-lg px-3 py-2 transition-colors">
          <Paperclip size={18} className="text-gray-300" />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && file.type.startsWith("image/")) {
                setImageFile(file);
              }
            }}
          />
        </label>

        <div className="relative flex-1">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              className="w-full bg-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-400"
              placeholder={imageFile ? "Add a caption..." : "Type a message..."}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
            />
            {currentSuggestion && currentSuggestion !== message && (
              <div className="absolute inset-0 px-4 py-2 pointer-events-none flex items-center">
                <span className="text-white">{message}</span>
                <span className="text-gray-500 opacity-70">
                  {currentSuggestion.slice(message.length)}
                </span>
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={(!imageFile && !message) || isUploading}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed text-white"
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </form>
  );
};

export default MessageInput;
