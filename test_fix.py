
import sys
import os
import unittest
from unittest.mock import MagicMock, patch

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

import ai_engine

class TestAIEngineFix(unittest.TestCase):
    @patch('ai_engine.model.generate_content')
    def test_generate_tasks_crash_fix(self, mock_generate):
        # Simulate API failure
        mock_generate.side_effect = Exception("API Quota Exceeded")
        
        # Mock offline heuristic to return nothing so we hit the crash point
        with patch('ai_engine.generate_offline_tasks', return_value=[]):
            # content_data for text
            content_data = {"type": "text", "content": "Short content"}
            
            # This should NOT raise NameError anymore
            try:
                tasks = ai_engine.generate_tasks(content_data)
                print(f"Result: {tasks}")
                
                # Check if we got the error message or empty list, but NOT a crash
                self.assertTrue(isinstance(tasks, list))
                if len(tasks) == 1:
                    self.assertIn("Error", tasks[0])
                    
            except NameError as e:
                self.fail(f"Test failed with NameError: {e} - The fix is not working!")
            except Exception as e:
                self.fail(f"Test failed with unexpected exception: {e}")

if __name__ == '__main__':
    unittest.main()
