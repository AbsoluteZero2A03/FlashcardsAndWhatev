CREATE TABLE flashcards(
	id bigserial primary key,
	front varchar,
	back varchar
); 

CREATE TABLE decks( 
	id bigserial primary key
);

CREATE TABLE relations(
	flashcard_id bigint,
	deck_id bigint
) 
