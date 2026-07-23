import PublicLegalLayout from "@/components/PublicLegalLayout";

export default function PoliticaPrivacidade() {
  return (
    <PublicLegalLayout
      title="Política de Privacidade"
      description="Entenda quais dados o SGA App trata, por que eles são necessários e quais escolhas estão sob o seu controle."
      updatedAt="23 de julho de 2026"
    >
      <section>
        <h2>1. Sobre esta Política</h2>
        <p>
          Esta Política explica como o SGA App, disponível em <strong>sgaapp.com.br</strong>,
          trata dados pessoais durante o cadastro, o acesso e o uso das funcionalidades de
          gestão de agendamentos, cobranças, contratos e sincronização com o Google Agenda.
        </p>
        <p>
          O tratamento observa a Lei nº 13.709/2018, a Lei Geral de Proteção de Dados
          Pessoais (“LGPD”), e demais normas aplicáveis. Ao inserir dados de clientes,
          responsáveis por eventos ou outras pessoas no sistema, o usuário deve possuir
          fundamento legítimo para esse tratamento e prestar as informações necessárias
          aos respectivos titulares.
        </p>
      </section>

      <section>
        <h2>2. Papéis e responsabilidades</h2>
        <p>
          Para os dados da conta e da utilização direta do serviço, o SGA App atua como
          responsável pelo tratamento. Para dados de terceiros cadastrados pelo usuário
          — como clientes, contratantes e responsáveis por eventos — o usuário poderá atuar
          como controlador, enquanto o SGA App realiza o tratamento necessário para fornecer
          a plataforma, conforme as instruções e configurações do usuário.
        </p>
      </section>

      <section>
        <h2>3. Dados que podemos tratar</h2>
        <ul>
          <li>
            <strong>Conta e autenticação:</strong> nome, e-mail, identificador da conta,
            senha protegida por hash e, quando utilizado o acesso com Google, identificador,
            nome, e-mail e foto disponibilizados pela conta Google.
          </li>
          <li>
            <strong>Perfil:</strong> nome, e-mail, foto e preferências de configuração.
          </li>
          <li>
            <strong>Agendamentos:</strong> descrição, data, horário, local, valor,
            observações, situação do evento e informações de sincronização.
          </li>
          <li>
            <strong>Cobranças e contratos:</strong> nome, CPF, endereço, valores,
            condições e formas de pagamento e demais informações fornecidas pelo usuário.
          </li>
          <li>
            <strong>Google Agenda:</strong> autorização de acesso, token de atualização
            armazenado de forma criptografada, identificação e nome da agenda escolhida,
            identificadores dos eventos sincronizados, data da sincronização e eventuais
            mensagens técnicas de erro.
          </li>
          <li>
            <strong>Dados técnicos:</strong> registros necessários à segurança,
            diagnóstico e funcionamento do serviço, como endereço IP, data e hora de acesso,
            tipo de navegador e informações de sessão, quando disponibilizados pela
            infraestrutura utilizada.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Como utilizamos os dados</h2>
        <ul>
          <li>Criar, autenticar e manter a conta do usuário.</li>
          <li>Fornecer as funções de agenda, calendário, cobrança, contrato e relatórios.</li>
          <li>Gerar, atualizar e organizar registros solicitados pelo usuário.</li>
          <li>Sincronizar eventos confirmados com a agenda Google selecionada.</li>
          <li>Prestar suporte, diagnosticar falhas e proteger o serviço contra abuso.</li>
          <li>Cumprir obrigações legais, regulatórias e determinações de autoridades.</li>
          <li>Aprimorar estabilidade, desempenho e experiência de uso.</li>
        </ul>
        <p>
          Conforme o contexto, as bases legais podem incluir execução de contrato ou de
          procedimentos preliminares, cumprimento de obrigação legal, exercício regular de
          direitos, legítimo interesse e consentimento, quando aplicável.
        </p>
      </section>

      <section>
        <h2>5. Uso de dados do Google</h2>
        <p>
          A conexão com o Google é opcional. No login, o SGA App utiliza os dados básicos
          autorizados pelo usuário para identificar a conta. Na integração com o Google
          Agenda, o aplicativo consulta a lista de agendas e seus nomes para exibir apenas
          aquelas em que o usuário pode gravar eventos. Depois da escolha, o SGA App cria
          ou atualiza nessa agenda os eventos originados pelos agendamentos confirmados.
        </p>
        <p>
          O SGA App não importa nem exibe eventos preexistentes da agenda do usuário, não
          utiliza dados do Google para publicidade e não vende esses dados. O conteúdo
          enviado ao Google limita-se ao necessário para representar o agendamento, como
          título, data, horário, local, observações e referência interna.
        </p>
        <p>
          O uso e a transferência de informações recebidas das APIs do Google pelo SGA App
          obedecem à{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noreferrer"
          >
            Política de Dados do Usuário dos Serviços de API do Google
          </a>
          , incluindo os requisitos de Uso Limitado.
        </p>
        <p>
          Ao desconectar o Google Agenda no perfil, o token de atualização e a seleção da
          agenda são removidos do SGA App. Eventos já criados no Google permanecem na conta
          do usuário e podem ser excluídos diretamente no Google Agenda.
        </p>
      </section>

      <section>
        <h2>6. Compartilhamento e operadores</h2>
        <p>Os dados podem ser tratados ou compartilhados, na medida necessária, com:</p>
        <ul>
          <li>provedores de hospedagem, banco de dados, armazenamento e segurança;</li>
          <li>Google, quando o usuário utiliza login ou sincronização com Google Agenda;</li>
          <li>prestadores que apoiem a operação técnica, sujeitos a deveres de proteção;</li>
          <li>autoridades públicas, quando houver obrigação legal ou ordem válida;</li>
          <li>
            sucessores em operação societária, observadas as garantias legais e os direitos
            dos titulares.
          </li>
        </ul>
        <p>Não comercializamos dados pessoais nem os compartilhamos com corretores de dados.</p>
      </section>

      <section>
        <h2>7. Cookies e tecnologias semelhantes</h2>
        <p>
          Utilizamos cookie essencial de sessão para manter o usuário autenticado e uma
          preferência local para o estado do menu lateral. Esses recursos são necessários
          ao funcionamento e à experiência da plataforma. Serviços do Google poderão usar
          tecnologias próprias quando o usuário optar pelo login ou pela integração, de
          acordo com as políticas do Google.
        </p>
      </section>

      <section>
        <h2>8. Armazenamento, retenção e transferência internacional</h2>
        <p>
          Os dados são mantidos pelo período necessário para oferecer o serviço, preservar
          a segurança, cumprir obrigações legais e exercer direitos. Solicitações de
          exclusão serão avaliadas considerando essas finalidades, limitações técnicas e
          hipóteses legais de conservação. Backups podem permanecer por ciclos adicionais
          de retenção antes da eliminação segura.
        </p>
        <p>
          Alguns fornecedores, inclusive o Google, podem processar dados fora do Brasil.
          Nesses casos, buscamos utilizar serviços com medidas contratuais e técnicas
          compatíveis com a legislação aplicável.
        </p>
      </section>

      <section>
        <h2>9. Segurança</h2>
        <p>
          Adotamos medidas razoáveis para reduzir riscos de acesso não autorizado, perda,
          alteração ou divulgação, incluindo proteção de credenciais, controles de acesso
          por usuário, conexão segura e criptografia do token de integração com o Google.
          Nenhum sistema, contudo, é totalmente imune a incidentes.
        </p>
      </section>

      <section>
        <h2>10. Direitos dos titulares</h2>
        <p>
          Nos termos da LGPD, o titular pode solicitar, conforme aplicável: confirmação e
          acesso; correção; anonimização, bloqueio ou eliminação; portabilidade; informação
          sobre compartilhamentos; revisão de decisões automatizadas; oposição; e revogação
          do consentimento.
        </p>
        <p>
          Solicitações podem ser apresentadas pelos canais oficiais de atendimento
          disponibilizados pelo SGA App ou ao administrador responsável pela conta. Para
          proteger o titular, poderemos solicitar informações para confirmar sua identidade.
        </p>
      </section>

      <section>
        <h2>11. Crianças e adolescentes</h2>
        <p>
          O serviço é destinado à gestão profissional e não é direcionado a crianças. Caso
          dados de crianças ou adolescentes sejam necessários para um evento, o usuário
          responsável deve observar o melhor interesse do titular e as exigências legais.
        </p>
      </section>

      <section>
        <h2>12. Alterações e contato</h2>
        <p>
          Esta Política poderá ser atualizada para refletir mudanças legais, técnicas ou
          funcionais. A versão vigente e sua data de atualização estarão sempre disponíveis
          nesta página. Dúvidas e solicitações de privacidade devem ser encaminhadas pelos
          canais oficiais de atendimento informados no acesso ou na contratação do SGA App.
        </p>
      </section>
    </PublicLegalLayout>
  );
}
