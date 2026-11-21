import { cognitoEndpoint } from './lib/config.js';

async function load() {
  // Floci にたまったメールの一覧（Floci だけの機能。本物の Cognito には無い）
  const { messages } = await (await fetch(`${cognitoEndpoint}/_aws/ses`)).json();
  const tbody = document.querySelector('#mails');
  tbody.replaceChildren(...messages.reverse().map((m) => {
    const tr = document.createElement('tr');
    for (const text of [new Date(m.Timestamp).toLocaleString(), m.Destination.ToAddresses.join(', '), m.Subject, m.Body.text_part]) {
      const td = document.createElement('td');
      td.textContent = text;
      tr.append(td);
    }
    return tr;
  }));
}

document.querySelector('#reload').addEventListener('click', load);
await load();
