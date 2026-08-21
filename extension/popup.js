answerDiv.innerHTML = `
      <div style="font-size: 14px; margin-bottom: 12px;">
        ${data.answer}
      </div>
      
      <div style="background: #1a1a1a; padding: 10px; border-radius: 8px; border: 1px solid #333; margin-top: 15px;">
          <div style="font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
            Live Observability Metrics
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 12px; color: #ccc;">Groundedness</span>
            <span style="font-size: 12px; font-weight: bold; color: ${data.groundedness_score > 80 ? '#4caf50' : '#ff9800'};">${data.groundedness_score}%</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 12px; color: #ccc;">Context Relevance</span>
            <span style="font-size: 12px; font-weight: bold; color: ${data.context_relevance > 80 ? '#4caf50' : '#ff9800'};">${data.context_relevance}%</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 12px; color: #ccc;">Answer Relevance</span>
            <span style="font-size: 12px; font-weight: bold; color: ${data.answer_relevance > 80 ? '#4caf50' : '#ff9800'};">${data.answer_relevance}%</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 12px; color: #ccc;">Faithfulness</span>
            <span style="font-size: 12px; font-weight: bold; color: ${data.faithfulness > 80 ? '#4caf50' : '#ff9800'};">${data.faithfulness}%</span>
          </div>
      </div>
    `;
