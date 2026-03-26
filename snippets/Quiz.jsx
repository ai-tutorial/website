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

  return (
    <div style={{
      border: '1px solid var(--border-color, #333)',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px',
      background: 'var(--bg-secondary, #1a1a2e)',
    }}>
      <p style={{ fontWeight: 600, marginBottom: '12px', fontSize: '15px' }}>{question}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {options.map((option, i) => {
          let bg = 'transparent';
          let borderColor = 'var(--border-color, #444)';

          if (revealed) {
            if (i === answer) {
              bg = 'rgba(34, 197, 94, 0.15)';
              borderColor = '#22c55e';
            } else if (i === selected && !isCorrect) {
              bg = 'rgba(239, 68, 68, 0.15)';
              borderColor = '#ef4444';
            }
          } else if (i === selected) {
            borderColor = 'var(--primary-color, #6366f1)';
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                border: `1px solid ${borderColor}`,
                borderRadius: '6px',
                background: bg,
                cursor: revealed ? 'default' : 'pointer',
                textAlign: 'left',
                fontSize: '14px',
                color: 'inherit',
                transition: 'border-color 0.2s',
                width: '100%',
              }}
            >
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                border: `1px solid ${borderColor}`,
                fontSize: '12px',
                fontWeight: 600,
                flexShrink: 0,
              }}>
                {String.fromCharCode(65 + i)}
              </span>
              {option}
            </button>
          );
        })}
      </div>
      {revealed && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          borderRadius: '6px',
          background: isCorrect ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          borderLeft: `3px solid ${isCorrect ? '#22c55e' : '#ef4444'}`,
          fontSize: '14px',
        }}>
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
 * @param {string} [props.title="Quiz: Check Your Understanding"] - Quiz section title
 * @param {React.ReactNode} props.children - QuizQuestion components
 */
export const Quiz = ({ title = "Quiz: Check Your Understanding", children }) => {
  return (
    <div style={{ marginTop: '32px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>{title}</h2>
      {children}
    </div>
  );
};

export { QuizQuestion };
