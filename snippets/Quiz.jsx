/**
 * Quiz component for multiple-choice questions with answer checking
 *
 * @param {Object} props
 * @param {string} props.question - The question text
 * @param {string[]} props.options - Array of answer options
 * @param {number} props.answer - Index of the correct answer (0-based)
 * @param {string} props.explanation - Explanation shown after answering
 */
const QuizQuestion = ({ question, options, answer, explanation }) => {
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);

  const handleSelect = (index) => {
    if (revealed) return;
    setSelected(index);
    setRevealed(true);
  };

  const isCorrect = selected === answer;

  const getOptionClass = (i) => {
    const classes = ['quiz-option'];
    if (revealed) {
      classes.push('quiz-option-disabled');
      if (i === answer) classes.push('quiz-option-correct');
      else if (i === selected && !isCorrect) classes.push('quiz-option-wrong');
    }
    return classes.join(' ');
  };

  return (
    <div className="quiz-card">
      <p className="quiz-question">{question}</p>
      <div className="quiz-options">
        {options.map((option, i) => (
          <button key={i} onClick={() => handleSelect(i)} className={getOptionClass(i)}>
            <span className="quiz-letter">{String.fromCharCode(65 + i)}</span>
            {option}
          </button>
        ))}
      </div>
      {revealed && (
        <div className={`quiz-feedback ${isCorrect ? 'quiz-feedback-correct' : 'quiz-feedback-wrong'}`}>
          <strong>{isCorrect ? 'Correct!' : 'Incorrect.'}</strong> {explanation}
        </div>
      )}
    </div>
  );
};

/**
 * Quiz wrapper component
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - QuizQuestion components
 */
export const Quiz = ({ children }) => {
  return (
    <div style={{ marginTop: '24px' }}>
      {children}
    </div>
  );
};

export { QuizQuestion };
