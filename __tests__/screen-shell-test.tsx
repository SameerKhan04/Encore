import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { Screen } from '@/components/Screen';

describe('<Screen />', () => {
  it('renders children inside a safe-area shell', async () => {
    const { getByText, getByTestId } = await render(
      <Screen>
        <Text>Shell child</Text>
      </Screen>,
    );

    expect(getByTestId('screen-shell')).toBeTruthy();
    expect(getByText('Shell child')).toBeTruthy();
  });
});
